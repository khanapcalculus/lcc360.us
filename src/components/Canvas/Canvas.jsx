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
import LassoTool from '../../tools/TransformTool';

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
        transform: new LassoTool(context),
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
    console.log('Current tool:', tool);
    
    // Detect if it's a touch device
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // Create a more user-friendly text editing experience
    const textarea = document.createElement('textarea');
    textarea.value = element.text;
    textarea.style.position = 'fixed';
    textarea.style.top = '50%';
    textarea.style.left = '50%';
    textarea.style.transform = 'translate(-50%, -50%)';
    textarea.style.zIndex = '10000';
    textarea.style.padding = isTouchDevice ? '20px' : '15px';
    textarea.style.fontSize = isTouchDevice ? '18px' : '16px';
    textarea.style.fontFamily = element.fontFamily || 'Arial';
    textarea.style.border = '2px solid #3b82f6';
    textarea.style.borderRadius = '8px';
    textarea.style.resize = 'both';
    textarea.style.minWidth = isTouchDevice ? '80vw' : '300px';
    textarea.style.minHeight = isTouchDevice ? '150px' : '100px';
    textarea.style.maxWidth = isTouchDevice ? '90vw' : '500px';
    textarea.style.backgroundColor = 'white';
    textarea.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
    textarea.style.outline = 'none';
    
    // Add save and cancel buttons for touch devices
    const buttonContainer = document.createElement('div');
    buttonContainer.style.position = 'fixed';
    buttonContainer.style.top = 'calc(50% + 100px)';
    buttonContainer.style.left = '50%';
    buttonContainer.style.transform = 'translateX(-50%)';
    buttonContainer.style.zIndex = '10001';
    buttonContainer.style.display = 'flex';
    buttonContainer.style.gap = '10px';
    
    const saveButton = document.createElement('button');
    saveButton.textContent = 'Save';
    saveButton.style.padding = isTouchDevice ? '12px 24px' : '8px 16px';
    saveButton.style.fontSize = isTouchDevice ? '16px' : '14px';
    saveButton.style.backgroundColor = '#3b82f6';
    saveButton.style.color = 'white';
    saveButton.style.border = 'none';
    saveButton.style.borderRadius = '6px';
    saveButton.style.cursor = 'pointer';
    saveButton.style.minWidth = isTouchDevice ? '80px' : '60px';
    
    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel';
    cancelButton.style.padding = isTouchDevice ? '12px 24px' : '8px 16px';
    cancelButton.style.fontSize = isTouchDevice ? '16px' : '14px';
    cancelButton.style.backgroundColor = '#6b7280';
    cancelButton.style.color = 'white';
    cancelButton.style.border = 'none';
    cancelButton.style.borderRadius = '6px';
    cancelButton.style.cursor = 'pointer';
    cancelButton.style.minWidth = isTouchDevice ? '80px' : '60px';
    
    buttonContainer.appendChild(saveButton);
    buttonContainer.appendChild(cancelButton);
    
    // Add instructions
    const instructions = document.createElement('div');
    instructions.textContent = isTouchDevice ? 
      'Tap Save to confirm or Cancel to discard changes' : 
      'Ctrl+Enter to save, Escape to cancel';
    instructions.style.position = 'fixed';
    instructions.style.top = isTouchDevice ? 'calc(50% + 160px)' : 'calc(50% + 80px)';
    instructions.style.left = '50%';
    instructions.style.transform = 'translateX(-50%)';
    instructions.style.zIndex = '10001';
    instructions.style.fontSize = isTouchDevice ? '14px' : '12px';
    instructions.style.color = '#666';
    instructions.style.backgroundColor = 'white';
    instructions.style.padding = '5px 10px';
    instructions.style.borderRadius = '4px';
    instructions.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
    instructions.style.textAlign = 'center';
    
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
    document.body.appendChild(buttonContainer);
    document.body.appendChild(instructions);
    textarea.focus();
    textarea.select();
    
    const handleSave = () => {
      const newText = textarea.value.trim();
      if (newText !== '' && newText !== element.text) {
        const updatedElement = {
          ...element,
          text: newText
        };
        console.log('Saving updated text element:', updatedElement);
        updateElement(updatedElement);
        if (context.saveToHistory) {
          context.saveToHistory();
        }
      }
      cleanup();
    };
    
    const handleCancel = () => {
      console.log('Text editing cancelled');
      cleanup();
    };
    
    const cleanup = () => {
      if (document.body.contains(textarea)) document.body.removeChild(textarea);
      if (document.body.contains(overlay)) document.body.removeChild(overlay);
      if (document.body.contains(instructions)) document.body.removeChild(instructions);
      if (document.body.contains(buttonContainer)) document.body.removeChild(buttonContainer);
    };
    
    // Add button event listeners
    saveButton.addEventListener('click', handleSave);
    cancelButton.addEventListener('click', handleCancel);
    
    // Handle keyboard events (for desktop)
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      }
    });
    
    // Handle click outside (only if not clicking on buttons)
    overlay.addEventListener('click', (e) => {
      if (!buttonContainer.contains(e.target)) {
        handleCancel();
      }
    });
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
  
  const handleTextTouch = (element) => {
    let touchTimer = null;
    let touchStartTime = 0;
    let feedbackElement = null;
    
    const handleTouchStart = (e) => {
      touchStartTime = Date.now();
      
      // Create visual feedback for long press
      feedbackElement = document.createElement('div');
      feedbackElement.textContent = 'Hold to edit text...';
      feedbackElement.style.position = 'fixed';
      feedbackElement.style.top = '20px';
      feedbackElement.style.left = '50%';
      feedbackElement.style.transform = 'translateX(-50%)';
      feedbackElement.style.backgroundColor = 'rgba(59, 130, 246, 0.9)';
      feedbackElement.style.color = 'white';
      feedbackElement.style.padding = '8px 16px';
      feedbackElement.style.borderRadius = '20px';
      feedbackElement.style.fontSize = '14px';
      feedbackElement.style.zIndex = '9999';
      feedbackElement.style.pointerEvents = 'none';
      feedbackElement.style.opacity = '0';
      feedbackElement.style.transition = 'opacity 0.3s ease';
      
      document.body.appendChild(feedbackElement);
      
      // Show feedback after a short delay
      setTimeout(() => {
        if (feedbackElement && document.body.contains(feedbackElement)) {
          feedbackElement.style.opacity = '1';
        }
      }, 100);
      
      touchTimer = setTimeout(() => {
        // Long press detected (500ms)
        console.log('Long press detected on text:', element);
        
        // Update feedback
        if (feedbackElement && document.body.contains(feedbackElement)) {
          feedbackElement.textContent = 'Opening editor...';
          feedbackElement.style.backgroundColor = 'rgba(34, 197, 94, 0.9)';
        }
        
        // Small delay to show the "opening" message
        setTimeout(() => {
          handleTextDoubleClick(element);
          cleanupFeedback();
        }, 200);
      }, 500);
    };
    
    const cleanupFeedback = () => {
      if (feedbackElement && document.body.contains(feedbackElement)) {
        feedbackElement.style.opacity = '0';
        setTimeout(() => {
          if (feedbackElement && document.body.contains(feedbackElement)) {
            document.body.removeChild(feedbackElement);
          }
        }, 300);
      }
    };
    
    const handleTouchEnd = (e) => {
      const touchDuration = Date.now() - touchStartTime;
      if (touchTimer) {
        clearTimeout(touchTimer);
      }
      
      cleanupFeedback();
      
      // If it was a quick tap (less than 200ms), treat as regular click
      if (touchDuration < 200) {
        handleElementClick(element);
      }
    };
    
    const handleTouchMove = (e) => {
      // Cancel long press if user moves finger
      if (touchTimer) {
        clearTimeout(touchTimer);
      }
      cleanupFeedback();
    };
    
    return {
      onTouchStart: handleTouchStart,
      onTouchEnd: handleTouchEnd,
      onTouchMove: handleTouchMove
    };
  };
  
  const renderElement = (element) => {
    console.log('Canvas: rendering element:', element.type, 'with dimensions:', 
               element.type === 'rectangle' ? `${element.width}x${element.height}` :
               element.type === 'circle' ? `radius: ${element.radius}` :
               element.type === 'line' ? `points: ${element.points}` : 
               element.type === 'polygon' ? `polygon with ${element.points?.length / 2} points` : 'unknown');
    
    switch (element.type) {
      case 'line':
        console.log('Canvas: rendering line element:', element.id, 'with dash:', element.dash);
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
            dash={element.dash}
            globalCompositeOperation={element.globalCompositeOperation}
            rotation={element.rotation || 0}
            onClick={() => handleElementClick(element)}
            listening={!element.id?.startsWith('temp-lasso-')}
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
        const touchHandlers = handleTextTouch(element);
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
            onDblClick={(e) => {
              e.evt.stopPropagation();
              handleTextDoubleClick(element);
            }}
            onTouchStart={touchHandlers.onTouchStart}
            onTouchEnd={touchHandlers.onTouchEnd}
            onTouchMove={touchHandlers.onTouchMove}
            onContextMenu={(e) => {
              e.evt.preventDefault();
              e.evt.stopPropagation();
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
      case 'polygon':
        console.log('Canvas: rendering polygon element:', element.id, 'with fill:', element.fill);
        return (
          <Line
            key={element.id}
            id={element.id}
            points={element.points}
            fill={element.fill}
            stroke={element.stroke}
            strokeWidth={element.strokeWidth}
            closed={true}
            globalCompositeOperation={element.globalCompositeOperation}
            rotation={element.rotation || 0}
            onClick={() => handleElementClick(element)}
            listening={!element.id?.startsWith('temp-lasso-')}
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