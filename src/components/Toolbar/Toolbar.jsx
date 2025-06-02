import React, { useContext, useEffect, useRef } from 'react';
import { WhiteboardContext } from '../../context/WhiteboardContext';
import ImageTool from '../../tools/ImageTool';
import ColorPalette from '../ColorPalette/ColorPalette.jsx';
import StrokePalette from '../StrokePalette/StrokePalette.jsx';
import './Toolbar.css';

// Custom icon mapping - you can replace these paths with your custom icons
const customIcons = {
  pen: '/icons/pen.png',
  eraser: '/icons/eraser.png',
  rectangle: '/icons/rectangle.png',
  circle: '/icons/circle.png',
  line: '/icons/line.png',
  transform: '/icons/transform.png',
  text: '/icons/text.png',
  pan: '/icons/pan.png',
  image: '/icons/image.png',
  trash: '/icons/trash.png'
};

// Fallback FontAwesome icons
const fallbackIcons = {
  pen: 'fas fa-pen',
  eraser: 'fas fa-eraser',
  rectangle: 'fas fa-square',
  circle: 'fas fa-circle',
  line: 'fas fa-slash',
  transform: 'fas fa-arrows-alt',
  text: 'fas fa-font',
  pan: 'fas fa-hand-paper',
  image: 'fas fa-image',
  trash: 'fas fa-trash'
};

const ToolIcon = ({ tool, className }) => {
  const [useCustom, setUseCustom] = React.useState(true);
  
  const handleImageError = () => {
    setUseCustom(false);
  };
  
  if (useCustom && customIcons[tool]) {
    return (
      <img 
        src={customIcons[tool]} 
        alt={tool}
        className="tool-icon"
        onError={handleImageError}
      />
    );
  }
  
  return <i className={fallbackIcons[tool]}></i>;
};

const Toolbar = () => {
  const context = useContext(WhiteboardContext);
  const { 
    tool, 
    setTool, 
    clearPage, 
    undo, 
    redo, 
    canUndo, 
    canRedo,
    selectedElement,
    deleteSelectedElement
  } = context;
  
  const fileInputRef = useRef(null);
  const toolInstances = useRef({});
  
  useEffect(() => {
    toolInstances.current = {
      image: new ImageTool(context)
    };
  }, [context]);
  
  const handleImageUpload = () => {
    fileInputRef.current.click();
  };
  
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const imageToolInstance = toolInstances.current.image;
      if (imageToolInstance) {
        imageToolInstance.uploadImage(file);
      }
      // Reset file input
      e.target.value = null;
    }
  };
  
  return (
    <div className="toolbar">
      <div className="tool-group">
        <button 
          className={`tool-button ${tool === 'pen' ? 'active' : ''}`}
          onClick={() => {
            console.log('Toolbar: Setting tool to pen');
            setTool('pen');
          }}
          title="Pen"
        >
          <ToolIcon tool="pen" />
        </button>
        
        <button 
          className={`tool-button ${tool === 'eraser' ? 'active' : ''}`}
          onClick={() => {
            console.log('Toolbar: Setting tool to eraser');
            setTool('eraser');
          }}
          title="Eraser"
        >
          <ToolIcon tool="eraser" />
        </button>
        
        <button 
          className={`tool-button ${tool === 'rectangle' ? 'active' : ''}`}
          onClick={() => {
            console.log('Toolbar: Setting tool to rectangle');
            setTool('rectangle');
          }}
          title="Rectangle"
        >
          <ToolIcon tool="rectangle" />
        </button>
        
        <button 
          className={`tool-button ${tool === 'circle' ? 'active' : ''}`}
          onClick={() => setTool('circle')}
          title="Circle"
        >
          <ToolIcon tool="circle" />
        </button>
        
        <button 
          className={`tool-button ${tool === 'line' ? 'active' : ''}`}
          onClick={() => setTool('line')}
          title="Line"
        >
          <ToolIcon tool="line" />
        </button>
        
        <button 
          className={`tool-button ${tool === 'transform' ? 'active' : ''}`}
          onClick={() => setTool('transform')}
          title="Transform"
        >
          <ToolIcon tool="transform" />
        </button>
        
        <button 
          className={`tool-button ${tool === 'text' ? 'active' : ''}`}
          onClick={() => setTool('text')}
          title="Text"
        >
          <ToolIcon tool="text" />
        </button>
        
        <button 
          className={`tool-button ${tool === 'pan' ? 'active' : ''}`}
          onClick={() => setTool('pan')}
          title="Pan"
        >
          <ToolIcon tool="pan" />
        </button>
        
        <button 
          className="tool-button"
          onClick={handleImageUpload}
          title="Upload Image"
        >
          <ToolIcon tool="image" />
        </button>
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          accept="image/*" 
          onChange={handleFileChange} 
        />
      </div>
      
      <div className="tool-group">
        <ColorPalette />
        <StrokePalette />
      </div>
      
      <div className="tool-group">
        <button 
          className="tool-button"
          onClick={undo}
          disabled={!canUndo}
          title="Undo"
        >
          <i className="fas fa-undo"></i>
        </button>
        
        <button 
          className="tool-button"
          onClick={redo}
          disabled={!canRedo}
          title="Redo"
        >
          <i className="fas fa-redo"></i>
        </button>
        
        <button 
          className="tool-button"
          onClick={deleteSelectedElement}
          disabled={!selectedElement}
          title={selectedElement ? "Delete Selected" : "Select an object to delete"}
        >
          <ToolIcon tool="trash" />
        </button>
      </div>
    </div>
  );
};

export default Toolbar;