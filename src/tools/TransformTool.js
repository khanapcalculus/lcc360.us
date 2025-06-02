export default class TransformTool {
  constructor(context) {
    this.context = context;
  }

  onMouseDown(e) {
    const { setSelectedElement, pages, currentPage } = this.context;
    
    // Don't interfere if clicking on transformer handles
    if (e.target.getClassName() === 'Transformer') {
      return;
    }

    const clickedOnEmpty = e.target === e.target.getStage();
    
    if (clickedOnEmpty) {
      // Clicked on empty area, clear selection
      setSelectedElement(null);
    } else {
      // Clicked on an element, select it
      const id = e.target.id();
      if (id) {
        const currentPageElements = pages[currentPage] || [];
        const element = currentPageElements.find(el => el.id === id);
        if (element) {
          setSelectedElement(element);
        }
      }
    }
  }

  onMouseMove(e) {
    // No mouse move handling needed for transform tool
  }

  onMouseUp(e) {
    // No mouse up handling needed for transform tool
  }

  onTransformEnd(e) {
    const { selectedElement, updateElement, saveToHistory } = this.context;
    if (selectedElement) {
      const node = e.target;
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      
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
        
        updatedElement.points = newPoints;
        
        // Reset the node's scale
        node.scaleX(1);
        node.scaleY(1);
        
      } else if (selectedElement.type === 'image') {
        // For images, apply scale to the current element's width and height
        const newWidth = Math.abs(selectedElement.width * scaleX);
        const newHeight = Math.abs(selectedElement.height * scaleY);
        
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
      
      updateElement(updatedElement);
      
      // Save to history after transformation
      if (saveToHistory) {
        saveToHistory();
      }
    }
  }
}