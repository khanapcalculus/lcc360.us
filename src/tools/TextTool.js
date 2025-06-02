export default class TextTool {
  constructor(context) {
    this.context = context;
    this.isEditing = false;
  }

  // Helper function to generate unique ID
  generateId() {
    return 'text_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
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

  onMouseDown(e) {
    const { color, setIsDrawing } = this.context;
    const pos = this.getTransformedPointerPosition(e.target.getStage());
    
    if (!pos) return;

    // Prompt user for text input
    const text = prompt('Enter text:');
    if (!text || text.trim() === '') return;

    const newElement = {
      id: this.generateId(),
      type: 'text',
      x: pos.x,
      y: pos.y,
      text: text.trim(),
      fontSize: 20,
      fontFamily: 'Arial',
      fill: color,
      align: 'left',
      verticalAlign: 'top',
      rotation: 0,
      scaleX: 1,
      scaleY: 1
    };
    
    this.context.addElement(newElement);
    setIsDrawing(false);
  }

  onMouseMove(e) {
    // Text tool doesn't need mouse move handling
  }

  onMouseUp(e) {
    // Text tool doesn't need mouse up handling
  }
} 