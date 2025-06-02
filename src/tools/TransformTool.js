export default class LassoTool {
  constructor(context) {
    this.context = context;
    this.isDrawing = false;
    this.lassoPoints = [];
    this.lassoLine = null;
    this.lassoFill = null;
  }

  // Helper function to get transformed mouse position accounting for pan and zoom
  getTransformedPointerPosition(stage) {
    const { position, scale } = this.context;
    const pointer = stage.getPointerPosition();
    if (!pointer) return null;
    
    // Transform the pointer position to account for canvas pan and zoom
    const transformedX = (pointer.x - position.x) / scale;
    const transformedY = (pointer.y - position.y) / scale;
    
    return { x: transformedX, y: transformedY };
  }

  // Check if a point is inside a polygon using ray casting algorithm
  isPointInPolygon(point, polygon) {
    const x = point.x;
    const y = point.y;
    let inside = false;

    for (let i = 0, j = polygon.length - 2; i < polygon.length; j = i, i += 2) {
      const xi = polygon[i];
      const yi = polygon[i + 1];
      const xj = polygon[j];
      const yj = polygon[j + 1];

      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }

    return inside;
  }

  // Check if an element is inside the lasso selection
  isElementInLasso(element, lassoPoints) {
    if (lassoPoints.length < 6) return false; // Need at least 3 points (6 coordinates)

    console.log('LassoTool: Checking element:', element.type, 'at position:', element.x, element.y);

    switch (element.type) {
      case 'rectangle':
        // Check if rectangle center or any corner is inside the lasso
        const rectCenter = { x: element.x + element.width / 2, y: element.y + element.height / 2 };
        const corners = [
          { x: element.x, y: element.y },
          { x: element.x + element.width, y: element.y },
          { x: element.x + element.width, y: element.y + element.height },
          { x: element.x, y: element.y + element.height }
        ];
        const rectInside = this.isPointInPolygon(rectCenter, lassoPoints) || 
                          corners.some(corner => this.isPointInPolygon(corner, lassoPoints));
        console.log('LassoTool: Rectangle check - center:', rectCenter, 'inside:', rectInside);
        return rectInside;

      case 'circle':
        // Check if the circle center is inside the lasso
        const center = { x: element.x, y: element.y };
        const centerInside = this.isPointInPolygon(center, lassoPoints);
        console.log('LassoTool: Circle check - center:', center, 'inside:', centerInside);
        return centerInside;

      case 'line':
        // Check if any line points are inside the lasso
        const linePoints = [];
        for (let i = 0; i < element.points.length; i += 2) {
          linePoints.push({ x: element.points[i], y: element.points[i + 1] });
        }
        const lineInside = linePoints.some(point => this.isPointInPolygon(point, lassoPoints));
        console.log('LassoTool: Line check - points:', linePoints, 'inside:', lineInside);
        return lineInside;

      case 'text':
        // Check if text position is inside the lasso
        const textPos = { x: element.x, y: element.y };
        const textInside = this.isPointInPolygon(textPos, lassoPoints);
        console.log('LassoTool: Text check - position:', textPos, 'inside:', textInside);
        return textInside;

      case 'image':
        // Check if image center or any corner is inside the lasso
        const imgCenter = { x: element.x + element.width / 2, y: element.y + element.height / 2 };
        const imageCorners = [
          { x: element.x, y: element.y },
          { x: element.x + element.width, y: element.y },
          { x: element.x + element.width, y: element.y + element.height },
          { x: element.x, y: element.y + element.height }
        ];
        const imgInside = this.isPointInPolygon(imgCenter, lassoPoints) || 
                         imageCorners.some(corner => this.isPointInPolygon(corner, lassoPoints));
        console.log('LassoTool: Image check - center:', imgCenter, 'inside:', imgInside);
        return imgInside;

      default:
        console.log('LassoTool: Unknown element type:', element.type);
        return false;
    }
  }

  onMouseDown(e) {
    console.log('LassoTool onMouseDown');
    
    // Don't interfere if clicking on transformer handles
    if (e.target.getClassName() === 'Transformer') {
      console.log('LassoTool: clicked on transformer, letting it handle');
      return;
    }

    const { setSelectedElement, pages, currentPage } = this.context;
    const clickedOnEmpty = e.target === e.target.getStage();
    
    // If clicking on an element without drawing, select it directly
    if (!clickedOnEmpty && !this.isDrawing) {
      const id = e.target.id();
      console.log('LassoTool: clicked on element with id:', id);
      if (id) {
        const currentPageElements = pages[currentPage] || [];
        const element = currentPageElements.find(el => el.id === id);
        if (element) {
          console.log('LassoTool: selecting element:', element);
          setSelectedElement(element);
          return;
        }
      }
    }

    // Start lasso drawing only on empty area
    if (clickedOnEmpty) {
      const pos = this.getTransformedPointerPosition(e.target.getStage());
      if (!pos) return;

      console.log('LassoTool: Starting lasso at position:', pos);
      this.isDrawing = true;
      this.lassoPoints = [pos.x, pos.y];
      
      // Clear previous selection when starting new lasso
      setSelectedElement(null);
      this.context.setSelectedElements([]);

      // Create temporary lasso line for visual feedback (dashed border)
      const newLassoLine = {
        type: 'line',
        id: 'temp-lasso-line-' + Date.now(),
        points: this.lassoPoints,
        stroke: '#007bff',
        strokeWidth: 2,
        lineCap: 'round',
        lineJoin: 'round',
        tension: 0,
        dash: [5, 5], // Dashed line for lasso
        globalCompositeOperation: 'source-over'
      };

      // Create temporary filled polygon for selection area
      const newLassoFill = {
        type: 'polygon',
        id: 'temp-lasso-fill-' + Date.now(),
        points: this.lassoPoints,
        fill: 'rgba(0, 255, 0, 0.2)', // Light green with transparency
        stroke: 'transparent',
        strokeWidth: 0,
        globalCompositeOperation: 'source-over'
      };

      console.log('LassoTool: Creating temporary lasso elements');
      const addedLine = this.context.addElement(newLassoLine);
      const addedFill = this.context.addElement(newLassoFill);
      this.lassoLine = addedLine || newLassoLine;
      this.lassoFill = addedFill || newLassoFill;
    }
  }

  onMouseMove(e) {
    if (!this.isDrawing) return;

    const stage = e.target.getStage();
    const point = this.getTransformedPointerPosition(stage);
    if (!point) return;

    this.lassoPoints = [...this.lassoPoints, point.x, point.y];
    console.log('LassoTool: Adding point to lasso:', point, 'Total points:', this.lassoPoints.length / 2);

    // Update the temporary lasso line (dashed border)
    if (this.lassoLine) {
      const updatedLassoLine = {
        ...this.lassoLine,
        points: this.lassoPoints
      };
      console.log('LassoTool: Updating lasso line with points:', this.lassoPoints);
      this.context.updateElement(updatedLassoLine);
    }

    // Update the temporary filled polygon
    if (this.lassoFill) {
      const updatedLassoFill = {
        ...this.lassoFill,
        points: this.lassoPoints
      };
      console.log('LassoTool: Updating lasso fill with points:', this.lassoPoints);
      this.context.updateElement(updatedLassoFill);
    }
  }

  onMouseUp(e) {
    if (!this.isDrawing) return;

    console.log('LassoTool onMouseUp - completing lasso selection');
    this.isDrawing = false;

    // Remove the temporary lasso elements
    if (this.lassoLine) {
      console.log('LassoTool: Removing temporary lasso line:', this.lassoLine.id);
      this.context.deleteElement(this.lassoLine.id);
      this.lassoLine = null;
    }
    if (this.lassoFill) {
      console.log('LassoTool: Removing temporary lasso fill:', this.lassoFill.id);
      this.context.deleteElement(this.lassoFill.id);
      this.lassoFill = null;
    }

    // Close the lasso by connecting to the first point
    if (this.lassoPoints.length >= 6) {
      this.lassoPoints.push(this.lassoPoints[0], this.lassoPoints[1]);
      console.log('LassoTool: Closed lasso with points:', this.lassoPoints);

      // Find all elements inside the lasso
      const { pages, currentPage, setSelectedElement, setSelectedElements } = this.context;
      const currentPageElements = pages[currentPage] || [];
      console.log('LassoTool: Checking', currentPageElements.length, 'elements for selection');
      
      const selectedElements = currentPageElements.filter(element => {
        // Skip temporary lasso lines and fills
        if (element.id && (element.id.startsWith('temp-lasso-'))) {
          return false;
        }
        const isInside = this.isElementInLasso(element, this.lassoPoints);
        console.log('LassoTool: Element', element.id, element.type, 'is inside lasso:', isInside);
        return isInside;
      });

      console.log('LassoTool: Found', selectedElements.length, 'elements in lasso:', selectedElements);

      if (selectedElements.length === 1) {
        // If only one element is selected, select it for transformation
        console.log('LassoTool: Selecting single element:', selectedElements[0]);
        setSelectedElement(selectedElements[0]);
        setSelectedElements([selectedElements[0]]);
      } else if (selectedElements.length > 1) {
        // For multiple elements, select the first one but store all
        console.log('LassoTool: Multiple elements selected:', selectedElements.length);
        setSelectedElement(selectedElements[0]); // Select first for transformation
        setSelectedElements(selectedElements); // Store all for deletion
        
        // Show a notification about multiple selection
        this.showMultiSelectionNotification(selectedElements.length);
      } else {
        console.log('LassoTool: No elements found in lasso selection');
        setSelectedElements([]);
      }
    } else {
      console.log('LassoTool: Not enough points for lasso selection:', this.lassoPoints.length);
    }

    // Reset lasso points
    this.lassoPoints = [];
  }

  showMultiSelectionNotification(count) {
    // Show visual feedback for multiple selection
    const notification = document.createElement('div');
    notification.textContent = `🎯 ${count} objects selected! First object is active for transformation. Use Delete key or trash button to delete all selected objects.`;
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.left = '50%';
    notification.style.transform = 'translateX(-50%)';
    notification.style.backgroundColor = 'rgba(34, 197, 94, 0.9)'; // Green background
    notification.style.color = 'white';
    notification.style.padding = '12px 20px';
    notification.style.borderRadius = '8px';
    notification.style.zIndex = '10000';
    notification.style.fontSize = '14px';
    notification.style.fontFamily = 'Arial, sans-serif';
    notification.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
    notification.style.animation = 'slideIn 0.3s ease-out';
    notification.style.maxWidth = '80vw';
    notification.style.textAlign = 'center';
    
    document.body.appendChild(notification);
    
    // Remove notification after 4 seconds (longer for more text)
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 4000);
  }

  onTransformEnd(e) {
    console.log('LassoTool onTransformEnd', e.target);
    const { selectedElement, updateElement, saveToHistory } = this.context;
    if (selectedElement) {
      const node = e.target;
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      
      console.log('LassoTool: transform end for element:', selectedElement.type);
      console.log('Node position:', node.x(), node.y());
      console.log('Node scale:', scaleX, scaleY);
      console.log('Node rotation:', node.rotation());
      console.log('Node size:', node.width(), node.height());
      console.log('Selected element current dimensions:', selectedElement);
      
      const updatedElement = {
        ...selectedElement,
        x: node.x(),
        y: node.y(),
        rotation: node.rotation()
      };
      
      if (selectedElement.type === 'rectangle') {
        // For rectangles, apply scale to the current element's width and height
        const newWidth = Math.abs(selectedElement.width * scaleX);
        const newHeight = Math.abs(selectedElement.height * scaleY);
        
        console.log('Rectangle scaling: original:', selectedElement.width, 'x', selectedElement.height, 
                   'scale:', scaleX, 'x', scaleY, 'new:', newWidth, 'x', newHeight);
        
        updatedElement.width = newWidth;
        updatedElement.height = newHeight;
        
        // Reset the node's scale after applying it to dimensions
        node.scaleX(1);
        node.scaleY(1);
        node.width(newWidth);
        node.height(newHeight);
        
      } else if (selectedElement.type === 'circle') {
        // For circles, apply scale to the current element's radius
        const newRadius = Math.abs(selectedElement.radius * Math.max(scaleX, scaleY));
        
        console.log('Circle scaling: original radius:', selectedElement.radius, 
                   'scale:', Math.max(scaleX, scaleY), 'new radius:', newRadius);
        
        updatedElement.radius = newRadius;
        
        // Reset the node's scale after applying it to radius
        node.scaleX(1);
        node.scaleY(1);
        node.radius(newRadius);
        
      } else if (selectedElement.type === 'line') {
        // For lines, we need to scale all points relative to the line's position
        const newPoints = [];
        for (let i = 0; i < selectedElement.points.length; i += 2) {
          newPoints.push(
            selectedElement.points[i] * scaleX,
            selectedElement.points[i + 1] * scaleY
          );
        }
        
        console.log('Line scaling: original points:', selectedElement.points, 
                   'scale:', scaleX, 'x', scaleY, 'new points:', newPoints);
        
        updatedElement.points = newPoints;
        
        // Reset the node's scale
        node.scaleX(1);
        node.scaleY(1);
        
      } else if (selectedElement.type === 'image') {
        // For images, apply scale to the current element's width and height
        const newWidth = Math.abs(selectedElement.width * scaleX);
        const newHeight = Math.abs(selectedElement.height * scaleY);
        
        console.log('Image scaling: original:', selectedElement.width, 'x', selectedElement.height, 
                   'scale:', scaleX, 'x', scaleY, 'new:', newWidth, 'x', newHeight);
        
        updatedElement.width = newWidth;
        updatedElement.height = newHeight;
        
        // Reset the node's scale after applying it to dimensions
        node.scaleX(1);
        node.scaleY(1);
        node.width(newWidth);
        node.height(newHeight);
        
      } else if (selectedElement.type === 'text') {
        // For text, apply scale to scaleX and scaleY properties
        updatedElement.scaleX = (selectedElement.scaleX || 1) * scaleX;
        updatedElement.scaleY = (selectedElement.scaleY || 1) * scaleY;
        
        // Reset the node's scale
        node.scaleX(1);
        node.scaleY(1);
      }
      
      console.log('LassoTool: updating element to:', updatedElement);
      updateElement(updatedElement);
      
      // Save to history after transformation
      if (saveToHistory) {
        saveToHistory();
      }
    }
  }
}