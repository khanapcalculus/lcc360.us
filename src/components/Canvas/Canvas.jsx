import React, { useContext, useEffect, useRef } from 'react';
import { Circle, Image, Layer, Line, Rect, Stage, Text, Transformer } from 'react-konva';
import { WhiteboardContext } from '../../context/WhiteboardContext';
import CircleTool from '../../tools/CircleTool';
import EraserTool from '../../tools/EraserTool';
import ImageTool from '../../tools/ImageTool';
import LineTool from '../../tools/LineTool';
import PanTool from '../../tools/PanTool';
import PenTool from '../../tools/PenTool';
import RectangleTool from '../../tools/RectangleTool';
import TextTool from '../../tools/TextTool';
import TransformTool from '../../tools/TransformTool';

const Canvas = () => {
  const context = useContext(WhiteboardContext);
  const {
    tool,
    selectedElement,
    setSelectedElement,
    scale,
    position,
    updateElement,
    pages,
    currentPage
  } = context;
  
  const stageRef = useRef(null);
  const layerRef = useRef(null);
  const transformerRef = useRef(null);
  
  const toolInstances = useRef({
    pen: null,
    eraser: null,
    rectangle: null,
    circle: null,
    line: null,
    transform: null,
    pan: null,
    image: null,
    text: null
  });
  
  // Test direct event listeners
  useEffect(() => {
    console.log('Canvas component mounted, stageRef:', stageRef.current);
    
    // Check Stage after a short delay to ensure it's mounted
    setTimeout(() => {
      if (stageRef.current) {
        const stage = stageRef.current;
        const container = stage.container();
        console.log('Stage container:', container);
        console.log('Stage size:', stage.width(), 'x', stage.height());
        console.log('Container style:', container.style.cssText);
        console.log('Container position:', container.getBoundingClientRect());
      }
    }, 1000);
  }, []);
  
  // Initialize tools
  useEffect(() => {
    console.log('Initializing tools with context:', context);
    if (context && Object.keys(context).length > 0 && !toolInstances.current.pen) {
      console.log('Context is valid, creating tool instances...');
      toolInstances.current = {
        pen: new PenTool(context),
        eraser: new EraserTool(context),
        rectangle: new RectangleTool(context),
        circle: new CircleTool(context),
        line: new LineTool(context),
        transform: new TransformTool(context),
        pan: new PanTool(context),
        image: new ImageTool(context),
        text: new TextTool(context)
      };
      console.log('Tool instances created:', Object.keys(toolInstances.current));
    } else if (toolInstances.current.pen) {
      console.log('Tools already exist, updating context references...');
      // Update context references without recreating tools
      Object.values(toolInstances.current).forEach(tool => {
        if (tool && tool.context) {
          tool.context = context;
        }
      });
    } else {
      console.log('Context is not ready yet:', context);
    }
  }, [context]);
  
  // Handle transformer
  useEffect(() => {
    if (selectedElement && transformerRef.current) {
      // Check if the selected element exists on the current page
      const currentPageElements = pages[currentPage] || [];
      const elementExistsOnCurrentPage = currentPageElements.find(el => el.id === selectedElement.id);
      
      if (!elementExistsOnCurrentPage) {
        console.log('Selected element not found on current page, clearing selection');
        setSelectedElement(null);
        return;
      }
      
      const node = layerRef.current.findOne(`#${selectedElement.id}`);
      if (node) {
        transformerRef.current.nodes([node]);
        transformerRef.current.getLayer().batchDraw();
      } else {
        console.log('Node not found for selected element, clearing selection');
        setSelectedElement(null);
      }
    } else if (transformerRef.current) {
      transformerRef.current.nodes([]);
      transformerRef.current.getLayer().batchDraw();
    }
  }, [selectedElement, pages, currentPage, setSelectedElement]);
  
  const handleMouseDown = (e) => {
    console.log('Canvas handleMouseDown triggered!');
    console.log('Mouse down - current tool:', tool, 'toolInstances:', toolInstances.current);
    console.log('Event target:', e.target, 'Stage:', e.target.getStage());
    
    // Don't prevent default for transform tool interactions
    if (tool !== 'transform') {
      e.evt.preventDefault();
    }
    
    try {
      const currentTool = toolInstances.current[tool];
      if (currentTool) {
        console.log('Calling onMouseDown for tool:', tool);
        currentTool.onMouseDown(e);
      } else {
        console.log('No tool instance found for:', tool);
        console.log('Available tools:', Object.keys(toolInstances.current));
      }
    } catch (error) {
      console.error('Error in handleMouseDown:', error);
    }
  };
  
  const handleMouseMove = (e) => {
    try {
      const currentTool = toolInstances.current[tool];
      if (currentTool) {
        currentTool.onMouseMove(e);
      }
    } catch (error) {
      console.error('Error in handleMouseMove:', error);
    }
  };
  
  const handleMouseUp = (e) => {
    console.log('Canvas handleMouseUp triggered!');
    
    // Don't prevent default for transform tool interactions
    if (tool !== 'transform') {
      e.evt.preventDefault();
    }
    
    try {
      const currentTool = toolInstances.current[tool];
      if (currentTool) {
        console.log('Calling onMouseUp for tool:', tool);
        currentTool.onMouseUp(e);
      }
    } catch (error) {
      console.error('Error in handleMouseUp:', error);
    }
  };
  
  const handleWheel = (e) => {
    if (tool === 'pan') {
      const panTool = toolInstances.current.pan;
      if (panTool) {
        panTool.onWheel(e);
      }
    }
  };
  
  const handleTransformEnd = (e) => {
    console.log('Canvas handleTransformEnd called');
    const transformTool = toolInstances.current.transform;
    if (transformTool) {
      transformTool.onTransformEnd(e);
    }
  };
  
  const handleElementClick = (element) => {
    console.log('Element clicked:', element, 'current tool:', tool);
    if (tool === 'transform') {
      setSelectedElement(element);
    }
  };

  const handleTextDoubleClick = (element) => {
    console.log('Text double-clicked:', element);
    
    // Create a more user-friendly text editing experience
    const textarea = document.createElement('textarea');
    textarea.value = element.text;
    textarea.style.position = 'fixed';
    textarea.style.top = '50%';
    textarea.style.left = '50%';
    textarea.style.transform = 'translate(-50%, -50%)';
    textarea.style.zIndex = '10000';
    textarea.style.padding = '10px';
    textarea.style.fontSize = '16px';
    textarea.style.fontFamily = element.fontFamily || 'Arial';
    textarea.style.border = '2px solid #3b82f6';
    textarea.style.borderRadius = '8px';
    textarea.style.resize = 'both';
    textarea.style.minWidth = '300px';
    textarea.style.minHeight = '100px';
    textarea.style.backgroundColor = 'white';
    textarea.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
    
    // Add overlay
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
    overlay.style.zIndex = '9999';
    
    document.body.appendChild(overlay);
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    
    const handleSave = () => {
      const newText = textarea.value.trim();
      if (newText !== '' && newText !== element.text) {
        const updatedElement = {
          ...element,
          text: newText
        };
        updateElement(updatedElement);
        if (context.saveToHistory) {
          context.saveToHistory();
        }
      }
      document.body.removeChild(textarea);
      document.body.removeChild(overlay);
    };
    
    const handleCancel = () => {
      document.body.removeChild(textarea);
      document.body.removeChild(overlay);
    };
    
    // Handle keyboard events
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      }
    });
    
    // Handle click outside
    overlay.addEventListener('click', handleCancel);
  };

  const handleCopyText = (element) => {
    if (element.type === 'text') {
      navigator.clipboard.writeText(element.text).then(() => {
        console.log('Text copied to clipboard:', element.text);
        
        // Show visual feedback
        const notification = document.createElement('div');
        notification.textContent = 'Text copied to clipboard!';
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.right = '20px';
        notification.style.backgroundColor = '#10b981';
        notification.style.color = 'white';
        notification.style.padding = '12px 20px';
        notification.style.borderRadius = '8px';
        notification.style.zIndex = '10000';
        notification.style.fontSize = '14px';
        notification.style.fontFamily = 'Arial, sans-serif';
        notification.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
        notification.style.animation = 'slideIn 0.3s ease-out';
        
        // Add CSS animation
        const style = document.createElement('style');
        style.textContent = `
          @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
          @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
          }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(notification);
        
        // Remove notification after 3 seconds
        setTimeout(() => {
          notification.style.animation = 'slideOut 0.3s ease-in';
          setTimeout(() => {
            if (document.body.contains(notification)) {
              document.body.removeChild(notification);
            }
            if (document.head.contains(style)) {
              document.head.removeChild(style);
            }
          }, 300);
        }, 3000);
        
      }).catch(err => {
        console.error('Failed to copy text:', err);
        
        // Show error feedback
        const notification = document.createElement('div');
        notification.textContent = 'Failed to copy text';
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.right = '20px';
        notification.style.backgroundColor = '#ef4444';
        notification.style.color = 'white';
        notification.style.padding = '12px 20px';
        notification.style.borderRadius = '8px';
        notification.style.zIndex = '10000';
        notification.style.fontSize = '14px';
        notification.style.fontFamily = 'Arial, sans-serif';
        notification.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
          if (document.body.contains(notification)) {
            document.body.removeChild(notification);
          }
        }, 3000);
      });
    }
  };
  
  const renderElement = (element) => {
    console.log('Canvas: rendering element:', element.type, 'with dimensions:', 
               element.type === 'rectangle' ? `${element.width}x${element.height}` :
               element.type === 'circle' ? `radius: ${element.radius}` :
               element.type === 'line' ? `points: ${element.points}` : 'unknown');
    
    switch (element.type) {
      case 'line':
        return (
          <Line
            key={element.id}
            id={element.id}
            points={element.points}
            stroke={element.stroke}
            strokeWidth={element.strokeWidth}
            lineCap={element.lineCap}
            lineJoin={element.lineJoin}
            tension={element.tension}
            globalCompositeOperation={element.globalCompositeOperation}
            rotation={element.rotation || 0}
            onClick={() => handleElementClick(element)}
          />
        );
      case 'rectangle':
        return (
          <Rect
            key={element.id}
            id={element.id}
            x={element.x}
            y={element.y}
            width={element.width}
            height={element.height}
            stroke={element.stroke}
            strokeWidth={element.strokeWidth}
            fill={element.fill}
            rotation={element.rotation || 0}
            onClick={() => handleElementClick(element)}
            draggable={tool === 'transform' && selectedElement?.id === element.id}
            onDragEnd={(e) => {
              if (tool === 'transform') {
                const updatedElement = {
                  ...element,
                  x: e.target.x(),
                  y: e.target.y()
                };
                updateElement(updatedElement);
                if (context.saveToHistory) {
                  context.saveToHistory();
                }
              }
            }}
          />
        );
      case 'circle':
        return (
          <Circle
            key={element.id}
            id={element.id}
            x={element.x}
            y={element.y}
            radius={element.radius}
            stroke={element.stroke}
            strokeWidth={element.strokeWidth}
            fill={element.fill}
            rotation={element.rotation || 0}
            onClick={() => handleElementClick(element)}
            draggable={tool === 'transform' && selectedElement?.id === element.id}
            onDragEnd={(e) => {
              if (tool === 'transform') {
                const updatedElement = {
                  ...element,
                  x: e.target.x(),
                  y: e.target.y()
                };
                updateElement(updatedElement);
                if (context.saveToHistory) {
                  context.saveToHistory();
                }
              }
            }}
          />
        );
      case 'image':
        return (
          <Image
            key={element.id}
            id={element.id}
            x={element.x}
            y={element.y}
            width={element.width}
            height={element.height}
            rotation={element.rotation || 0}
            image={(() => {
              const img = new window.Image();
              img.src = element.src;
              return img;
            })()}
            onClick={() => handleElementClick(element)}
            draggable={tool === 'transform' && selectedElement?.id === element.id}
            onDragEnd={(e) => {
              if (tool === 'transform') {
                const updatedElement = {
                  ...element,
                  x: e.target.x(),
                  y: e.target.y()
                };
                updateElement(updatedElement);
                if (context.saveToHistory) {
                  context.saveToHistory();
                }
              }
            }}
          />
        );
      case 'text':
        return (
          <Text
            key={element.id}
            id={element.id}
            x={element.x}
            y={element.y}
            text={element.text}
            fontSize={element.fontSize}
            fontFamily={element.fontFamily}
            fill={element.fill}
            align={element.align}
            verticalAlign={element.verticalAlign}
            rotation={element.rotation || 0}
            scaleX={element.scaleX || 1}
            scaleY={element.scaleY || 1}
            onClick={() => handleElementClick(element)}
            onDblClick={() => handleTextDoubleClick(element)}
            onContextMenu={(e) => {
              e.evt.preventDefault();
              handleCopyText(element);
            }}
            draggable={tool === 'transform' && selectedElement?.id === element.id}
            onDragEnd={(e) => {
              if (tool === 'transform') {
                const updatedElement = {
                  ...element,
                  x: e.target.x(),
                  y: e.target.y()
                };
                updateElement(updatedElement);
                if (context.saveToHistory) {
                  context.saveToHistory();
                }
              }
            }}
            onTransformEnd={(e) => {
              if (tool === 'transform') {
                const node = e.target;
                const updatedElement = {
                  ...element,
                  x: node.x(),
                  y: node.y(),
                  rotation: node.rotation(),
                  scaleX: node.scaleX(),
                  scaleY: node.scaleY()
                };
                updateElement(updatedElement);
                if (context.saveToHistory) {
                  context.saveToHistory();
                }
              }
            }}
          />
        );
      default:
        return null;
    }
  };
  
  return (
    <div className="canvas-container">
      <Stage
        ref={stageRef}
        width={window.innerWidth}
        height={window.innerHeight}
        onClick={(e) => {
          console.log('🎯 Stage clicked!', e);
          console.log('Stage dimensions:', window.innerWidth, 'x', window.innerHeight);
          console.log('Click position:', e.evt.clientX, e.evt.clientY);
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onPointerDown={handleMouseDown}
        onPointerMove={handleMouseMove}
        onPointerUp={handleMouseUp}
        onWheel={handleWheel}
        scaleX={scale}
        scaleY={scale}
        x={position.x}
        y={position.y}
        listening={true}
        preventDefault={false}
        style={{ backgroundColor: '#ffffff' }}
      >
        <Layer 
          ref={layerRef}
          listening={true}
        >
          {(pages[currentPage] || []).map(renderElement)}
          <Transformer
            ref={transformerRef}
            boundBoxFunc={(oldBox, newBox) => {
              if (newBox.width < 5 || newBox.height < 5) {
                return oldBox;
              }
              return newBox;
            }}
            onTransformEnd={handleTransformEnd}
            enabledAnchors={[
              'top-left', 'top-center', 'top-right',
              'middle-right', 'middle-left',
              'bottom-left', 'bottom-center', 'bottom-right'
            ]}
            rotateEnabled={true}
            borderEnabled={true}
            anchorSize={8}
            anchorStroke="#666"
            anchorFill="#fff"
            anchorCornerRadius={2}
          />
        </Layer>
      </Stage>
    </div>
  );
};

export default Canvas;