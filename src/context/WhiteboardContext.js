import React, { createContext, useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';

export const WhiteboardContext = createContext();

export const WhiteboardProvider = ({ children }) => {
  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(5);
  const [history, setHistory] = useState([{ pages: { 1: [] }, currentPage: 1 }]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pages, setPages] = useState({ 1: [] });
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedElement, setSelectedElement] = useState(null);
  const [selectedElementsInternal, setSelectedElementsInternal] = useState([]);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  
  const socket = useRef(null);
  const userId = useRef(uuidv4());
  const updateThrottle = useRef(null);
  const isDebug = process.env.NODE_ENV === 'development';

  // Load saved data on component mount
  useEffect(() => {
    const loadSavedData = () => {
      try {
        const savedPages = localStorage.getItem('whiteboard-pages');
        const savedCurrentPage = localStorage.getItem('whiteboard-current-page');
        const savedHistory = localStorage.getItem('whiteboard-history');
        const savedHistoryIndex = localStorage.getItem('whiteboard-history-index');
        
        if (savedPages) {
          const parsedPages = JSON.parse(savedPages);
          setPages(parsedPages);
          console.log('WhiteboardContext: Loaded saved pages:', parsedPages);
        }
        
        if (savedCurrentPage) {
          const parsedCurrentPage = parseInt(savedCurrentPage);
          setCurrentPage(parsedCurrentPage);
          console.log('WhiteboardContext: Loaded saved current page:', parsedCurrentPage);
        }
        
        if (savedHistory) {
          const parsedHistory = JSON.parse(savedHistory);
          setHistory(parsedHistory);
          console.log('WhiteboardContext: Loaded saved history');
        }
        
        if (savedHistoryIndex) {
          const parsedHistoryIndex = parseInt(savedHistoryIndex);
          setHistoryIndex(parsedHistoryIndex);
          console.log('WhiteboardContext: Loaded saved history index:', parsedHistoryIndex);
        }
      } catch (error) {
        console.error('WhiteboardContext: Error loading saved data:', error);
      }
    };
    
    loadSavedData();
  }, []);

  // Save data whenever pages change
  useEffect(() => {
    try {
      localStorage.setItem('whiteboard-pages', JSON.stringify(pages));
      localStorage.setItem('whiteboard-current-page', currentPage.toString());
      console.log('WhiteboardContext: Saved pages and current page to localStorage');
    } catch (error) {
      console.error('WhiteboardContext: Error saving pages to localStorage:', error);
    }
  }, [pages, currentPage]);

  // Save history whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('whiteboard-history', JSON.stringify(history));
      localStorage.setItem('whiteboard-history-index', historyIndex.toString());
      console.log('WhiteboardContext: Saved history to localStorage');
    } catch (error) {
      console.error('WhiteboardContext: Error saving history to localStorage:', error);
    }
  }, [history, historyIndex]);

  const updateElementsFromSocket = (data) => {
    console.log('WhiteboardContext: updateElementsFromSocket called with:', data);
    
    if (data.type === 'add') {
      setPages(prevPages => {
        const updatedPages = { ...prevPages };
        // Ensure the page exists
        if (!updatedPages[data.page]) {
          updatedPages[data.page] = [];
        }
        // Check if element already exists on this page to prevent duplicates
        const elementExists = updatedPages[data.page].some(el => el.id === data.element.id);
        if (!elementExists) {
          updatedPages[data.page] = [...updatedPages[data.page], data.element];
          console.log('WhiteboardContext: Added element to page', data.page);
        } else {
          console.log('WhiteboardContext: Element already exists on page', data.page, 'skipping add');
        }
        return updatedPages;
      });
    } else if (data.type === 'update') {
      setPages(prevPages => {
        const updatedPages = { ...prevPages };
        // Ensure the page exists
        if (!updatedPages[data.page]) {
          updatedPages[data.page] = [];
        }
        // Only update if element exists on this page
        const elementIndex = updatedPages[data.page].findIndex(el => el.id === data.element.id);
        if (elementIndex !== -1) {
          updatedPages[data.page] = updatedPages[data.page].map(el => 
            el.id === data.element.id ? data.element : el
          );
          console.log('WhiteboardContext: Updated element on page', data.page);
        } else {
          console.log('WhiteboardContext: Element not found on page', data.page, 'for update');
        }
        return updatedPages;
      });
    } else if (data.type === 'delete') {
      setPages(prevPages => {
        const updatedPages = { ...prevPages };
        if (updatedPages[data.page]) {
          updatedPages[data.page] = updatedPages[data.page].filter(el => el.id !== data.elementId);
          console.log('WhiteboardContext: Deleted element from page', data.page);
        }
        return updatedPages;
      });
    } else if (data.type === 'clear') {
      setPages(prevPages => {
        const updatedPages = { ...prevPages };
        if (updatedPages[data.page]) {
          updatedPages[data.page] = [];
          console.log('WhiteboardContext: Cleared page', data.page);
        }
        return updatedPages;
      });
    } else if (data.type === 'page-delete') {
      setPages(prevPages => {
        const updatedPages = { ...prevPages };
        delete updatedPages[data.pageNumber];
        
        // If we're on the deleted page, switch to another page
        if (data.pageNumber === currentPage) {
          const remainingPages = Object.keys(updatedPages).map(p => parseInt(p)).sort((a, b) => a - b);
          const newCurrentPage = remainingPages[0] || 1;
          setCurrentPage(newCurrentPage);
          setSelectedElement(null);
        }
        
        console.log('WhiteboardContext: Deleted page', data.pageNumber);
        return updatedPages;
      });
    }
  };

  const handleSocketMessage = (data) => {
    const receiveTime = Date.now();
    if (isDebug) console.log('WhiteboardContext: Received element-update:', data);
    
    // Log latency for test messages
    if (data.type === 'test' && data.element && data.element.timestamp) {
      const latency = receiveTime - data.element.timestamp;
      console.log('🧪 Real-time sync latency:', latency, 'ms');
    }
    
    if (data.userId !== userId.current) {
      if (isDebug) console.log('WhiteboardContext: Processing element update from another user');
      updateElementsFromSocket(data);
    } else {
      if (isDebug) console.log('WhiteboardContext: Ignoring own element update');
    }
  };

  const handlePageChange = (data) => {
    console.log('WhiteboardContext: Received page-change:', data);
    if (data.userId !== userId.current) {
      console.log('WhiteboardContext: Processing page change from another user');
      // Only update the pages data, don't force current user to change pages
      setPages(prevPages => {
        const updatedPages = { ...prevPages };
        // Merge the received pages with existing pages
        Object.keys(data.pages).forEach(pageNum => {
          updatedPages[pageNum] = data.pages[pageNum];
        });
        return updatedPages;
      });
    } else {
      console.log('WhiteboardContext: Ignoring own page change');
    }
  };

  // Initialize socket connection
  useEffect(() => {
    if (isDebug) console.log('WhiteboardContext: Initializing socket connection...');
    
    socket.current = io('https://lcc360-us.onrender.com', {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      maxReconnectionAttempts: 10,
      randomizationFactor: 0.5,
      upgrade: true,
      rememberUpgrade: true
    });
    
    socket.current.on('connect', () => {
      if (isDebug) console.log('WhiteboardContext: Connected to server');
      userId.current = socket.current.id;
    });
    
    socket.current.on('connection-confirmed', (data) => {
      if (isDebug) console.log('WhiteboardContext: Connection confirmed:', data);
    });
    
    socket.current.on('connect_error', (error) => {
      console.error('WhiteboardContext: Connection error:', error);
    });
    
    socket.current.on('reconnect', (attemptNumber) => {
      if (isDebug) console.log('WhiteboardContext: Reconnected after', attemptNumber, 'attempts');
    });
    
    socket.current.on('reconnect_error', (error) => {
      console.error('WhiteboardContext: Reconnection error:', error);
    });
    
    socket.current.on('disconnect', () => {
      if (isDebug) console.log('WhiteboardContext: Disconnected from server');
    });
    
    socket.current.on('element-update', handleSocketMessage);
    socket.current.on('page-change', handlePageChange);
    
    return () => {
      console.log('WhiteboardContext: Cleaning up socket connection...');
      if (socket.current) {
        socket.current.disconnect();
      }
    };
  }, []);

  const deleteElement = (elementId) => {
    setPages(prevPages => {
      const updatedPages = { ...prevPages };
      updatedPages[currentPage] = updatedPages[currentPage].filter(el => el.id !== elementId);
      
      // Add to history
      const newHistory = [...history.slice(0, historyIndex + 1), {
        pages: updatedPages,
        currentPage
      }];
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      
      // Emit to socket
      socket.current.emit('element-update', {
        type: 'delete',
        page: currentPage,
        elementId,
        userId: userId.current
      });
      
      return updatedPages;
    });
  };

  const deleteSelectedElement = () => {
    if (selectedElementsInternal.length > 1) {
      console.log('WhiteboardContext: Deleting multiple selected elements:', selectedElementsInternal.length);
      
      const count = selectedElementsInternal.length;
      
      // Delete all selected elements
      selectedElementsInternal.forEach(element => {
        deleteElement(element.id);
      });
      
      // Clear the selections
      setSelectedElementsInternal([]);
      setSelectedElement(null);
      
      // Show notification
      const notification = document.createElement('div');
      notification.textContent = `🗑️ Deleted ${count} objects`;
      notification.style.position = 'fixed';
      notification.style.top = '20px';
      notification.style.right = '20px';
      notification.style.backgroundColor = 'rgba(239, 68, 68, 0.9)';
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
    } else if (selectedElement) {
      // Single element deletion
      deleteElement(selectedElement.id);
      setSelectedElement(null);
      setSelectedElementsInternal([]);
    }
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Delete' && (selectedElement || selectedElementsInternal.length > 0)) {
        deleteSelectedElement();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedElement, selectedElementsInternal, deleteSelectedElement]);

  const addElement = (element) => {
    console.log('WhiteboardContext: addElement called with:', element);
    const newElement = { ...element, id: uuidv4() };
    console.log('WhiteboardContext: Created new element with ID:', newElement.id);
    
    setPages(prevPages => {
      const updatedPages = { ...prevPages };
      
      // Ensure current page exists
      if (!updatedPages[currentPage]) {
        updatedPages[currentPage] = [];
      }
      
      // Check if element with same ID already exists (shouldn't happen with uuidv4, but safety check)
      const elementExists = updatedPages[currentPage].some(el => el.id === newElement.id);
      if (!elementExists) {
        updatedPages[currentPage] = [...updatedPages[currentPage], newElement];
        console.log('WhiteboardContext: Added element to current page:', currentPage);
      } else {
        console.log('WhiteboardContext: Element with same ID already exists, skipping add');
        return prevPages; // Return unchanged if duplicate
      }
      
      console.log('WhiteboardContext: Updated pages:', updatedPages);
      
      // Add to history
      const newHistory = [...history.slice(0, historyIndex + 1), {
        pages: updatedPages,
        currentPage
      }];
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      
      // Emit to socket
      if (socket.current) {
        console.log('WhiteboardContext: Emitting element-update to socket');
        console.log('WhiteboardContext: Socket connected?', socket.current.connected);
        console.log('WhiteboardContext: Emitting data:', {
          type: 'add',
          page: currentPage,
          element: newElement,
          userId: userId.current
        });
        socket.current.emit('element-update', {
          type: 'add',
          page: currentPage,
          element: newElement,
          userId: userId.current
        });
        console.log('WhiteboardContext: Element-update emitted successfully');
      } else {
        console.error('WhiteboardContext: Socket not available for emit');
      }
      
      return updatedPages;
    });
    
    // Return the new element with ID
    return newElement;
  };

  const updateElement = (updatedElement) => {
    if (isDebug) console.log('WhiteboardContext: updateElement called with:', updatedElement);
    setPages(prevPages => {
      const updatedPages = { ...prevPages };
      const oldElement = updatedPages[currentPage].find(el => el.id === updatedElement.id);
      if (isDebug) console.log('WhiteboardContext: updating element from:', oldElement, 'to:', updatedElement);
      
      updatedPages[currentPage] = updatedPages[currentPage].map(el => 
        el.id === updatedElement.id ? updatedElement : el
      );
      
      if (isDebug) console.log('WhiteboardContext: updated pages:', updatedPages);
      
      // Don't add to history during drawing - only when drawing is complete
      
      // Throttle socket emissions to improve performance
      if (updateThrottle.current) {
        clearTimeout(updateThrottle.current);
      }
      
      updateThrottle.current = setTimeout(() => {
        // Emit to socket
        if (socket.current && socket.current.connected) {
          if (isDebug) console.log('WhiteboardContext: Emitting element update to socket:', updatedElement.id);
          socket.current.emit('element-update', {
            type: 'update',
            page: currentPage,
            element: updatedElement,
            userId: userId.current
          });
        } else {
          console.error('WhiteboardContext: Socket not connected for element update');
        }
      }, 16); // ~60fps throttling
      
      return updatedPages;
    });
  };

  // Add to history when an action is complete (like finishing a drawing)
  const saveToHistory = () => {
    const newHistory = [...history.slice(0, historyIndex + 1), {
      pages: { ...pages },
      currentPage
    }];
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    console.log('WhiteboardContext: Saved to history, index:', newHistory.length - 1);
  };

  const clearPage = () => {
    setPages(prevPages => {
      const updatedPages = { ...prevPages };
      updatedPages[currentPage] = [];
      
      // Add to history
      const newHistory = [...history.slice(0, historyIndex + 1), {
        pages: updatedPages,
        currentPage
      }];
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      
      // Emit to socket
      socket.current.emit('element-update', {
        type: 'clear',
        page: currentPage,
        userId: userId.current
      });
      
      return updatedPages;
    });
  };

  const deletePage = (pageNumber) => {
    if (Object.keys(pages).length <= 1) {
      console.log('Cannot delete the last page');
      return;
    }

    setPages(prevPages => {
      const updatedPages = { ...prevPages };
      delete updatedPages[pageNumber];
      
      // If we're deleting the current page, switch to another page
      let newCurrentPage = currentPage;
      if (pageNumber === currentPage) {
        const remainingPages = Object.keys(updatedPages).map(p => parseInt(p)).sort((a, b) => a - b);
        newCurrentPage = remainingPages[0] || 1;
      }
      
      // Add to history
      const newHistory = [...history.slice(0, historyIndex + 1), {
        pages: updatedPages,
        currentPage: newCurrentPage
      }];
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      
      // Update current page if needed
      if (newCurrentPage !== currentPage) {
        setCurrentPage(newCurrentPage);
      }
      
      // Clear selected element if it was on the deleted page
      if (pageNumber === currentPage) {
        setSelectedElement(null);
      }
      
      // Emit to socket
      socket.current.emit('page-delete', {
        pageNumber,
        userId: userId.current
      });
      
      return updatedPages;
    });
  };

  const changePage = (pageNumber) => {
    console.log('WhiteboardContext: changing page from', currentPage, 'to', pageNumber);
    console.log('WhiteboardContext: current page elements before change:', pages[currentPage]);
    console.log('WhiteboardContext: target page elements before change:', pages[pageNumber]);
    
    // Clear selected element when changing pages
    setSelectedElement(null);
    
    if (!pages[pageNumber]) {
      setPages(prevPages => {
        const updatedPages = { ...prevPages, [pageNumber]: [] };
        
        // Emit to socket
        socket.current.emit('page-change', {
          pages: updatedPages,
          userId: userId.current
        });
        
        return updatedPages;
      });
    }
    
    setCurrentPage(pageNumber);
    
    // Log elements after page change
    setTimeout(() => {
      console.log('WhiteboardContext: elements after page change:', pages[pageNumber]);
    }, 100);
  };

  const undo = () => {
    console.log('WhiteboardContext: undo called, historyIndex:', historyIndex, 'history length:', history.length);
    if (historyIndex > 0) {
      // Clear selected element before undo
      setSelectedElement(null);
      
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const prevState = history[newIndex];
      console.log('WhiteboardContext: undoing to state:', prevState);
      setPages(prevState.pages);
      setCurrentPage(prevState.currentPage);
      
      // Emit to socket
      socket.current.emit('page-change', {
        pages: prevState.pages,
        userId: userId.current
      });
    } else {
      console.log('WhiteboardContext: cannot undo, at beginning of history');
    }
  };

  const redo = () => {
    console.log('WhiteboardContext: redo called, historyIndex:', historyIndex, 'history length:', history.length);
    if (historyIndex < history.length - 1) {
      // Clear selected element before redo
      setSelectedElement(null);
      
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const nextState = history[newIndex];
      console.log('WhiteboardContext: redoing to state:', nextState);
      setPages(nextState.pages);
      setCurrentPage(nextState.currentPage);
      
      // Emit to socket
      socket.current.emit('page-change', {
        pages: nextState.pages,
        userId: userId.current
      });
    } else {
      console.log('WhiteboardContext: cannot redo, at end of history');
    }
  };

  const clearStorage = () => {
    try {
      localStorage.removeItem('whiteboard-pages');
      localStorage.removeItem('whiteboard-current-page');
      localStorage.removeItem('whiteboard-history');
      localStorage.removeItem('whiteboard-history-index');
      console.log('WhiteboardContext: Cleared all localStorage data');
    } catch (error) {
      console.error('WhiteboardContext: Error clearing localStorage:', error);
    }
  };

  // Performance test function
  const testRealTimeSync = () => {
    const testElement = {
      type: 'test',
      timestamp: Date.now(),
      message: `Performance test from ${userId.current}`
    };
    
    console.log('🧪 Sending performance test:', testElement);
    
    if (socket.current && socket.current.connected) {
      socket.current.emit('element-update', {
        type: 'test',
        element: testElement,
        userId: userId.current,
        page: currentPage
      });
    } else {
      console.error('Socket not connected for performance test');
    }
  };

  // Wrapper for setSelectedElements with debugging
  const setSelectedElements = (elements) => {
    console.log('🔧 WhiteboardContext: setSelectedElements called with:', elements);
    console.log('🔧 WhiteboardContext: elements count:', elements?.length || 0);
    setSelectedElementsInternal(elements);
    
    // Log the state after a short delay to see if it was set correctly
    setTimeout(() => {
      console.log('🔧 WhiteboardContext: selectedElements state after update:', selectedElementsInternal);
    }, 100);
  };

  return (
    <WhiteboardContext.Provider
      value={{
        tool,
        setTool,
        color,
        setColor,
        strokeWidth,
        setStrokeWidth,
        elements: pages[currentPage] || [],
        addElement,
        updateElement,
        deleteElement,
        clearPage,
        currentPage,
        changePage,
        pages,
        undo,
        redo,
        saveToHistory,
        isDrawing,
        setIsDrawing,
        selectedElement,
        setSelectedElement,
        selectedElements: selectedElementsInternal,
        setSelectedElements,
        scale,
        setScale,
        position,
        setPosition,
        canUndo: historyIndex > 0,
        canRedo: historyIndex < history.length - 1,
        clearStorage,
        deleteSelectedElement,
        deletePage,
        testRealTimeSync
      }}
    >
      {children}
    </WhiteboardContext.Provider>
  );
};