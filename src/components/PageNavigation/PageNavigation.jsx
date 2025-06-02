import React, { useContext } from 'react';
import { WhiteboardContext } from '../../context/WhiteboardContext';
import './PageNavigation.css';

const PageNavigation = () => {
  const { currentPage, changePage, pages, deletePage } = useContext(WhiteboardContext);
  
  const handlePageChange = (pageNumber) => {
    changePage(pageNumber);
  };
  
  const handleAddPage = () => {
    const newPageNumber = Object.keys(pages).length + 1;
    changePage(newPageNumber);
  };

  const handleDeletePage = (pageNumber, e) => {
    e.stopPropagation(); // Prevent page selection when clicking delete
    if (Object.keys(pages).length > 1) {
      if (window.confirm(`Are you sure you want to delete page ${pageNumber}? This action cannot be undone.`)) {
        deletePage(pageNumber);
      }
    } else {
      alert('Cannot delete the last page.');
    }
  };
  
  return (
    <div className="page-navigation">
      <div className="page-list">
        {Object.keys(pages).map((pageNumber) => (
          <div key={pageNumber} className="page-item">
            <button
              className={`page-button ${parseInt(pageNumber) === currentPage ? 'active' : ''}`}
              onClick={() => handlePageChange(parseInt(pageNumber))}
            >
              {pageNumber}
            </button>
            {Object.keys(pages).length > 1 && (
              <button
                className="delete-page-button"
                onClick={(e) => handleDeletePage(parseInt(pageNumber), e)}
                title={`Delete page ${pageNumber}`}
              >
                <i className="fas fa-times"></i>
              </button>
            )}
          </div>
        ))}
        <button className="add-page-button" onClick={handleAddPage}>
          <i className="fas fa-plus"></i>
        </button>
      </div>
    </div>
  );
};

export default PageNavigation;