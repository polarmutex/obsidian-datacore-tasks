/**
 * Drag and drop utilities for the Kanban board
 */

export const dragDropUtils = {
    /**
     * Set up drag and drop event listeners for a kanban board
     */
    setupDragAndDrop(boardElement, options = {}) {
        const {
            onDragStart = () => {},
            onDragOver = () => {},
            onDrop = () => {},
            onDragEnd = () => {}
        } = options;
        
        // Prevent default drag behaviors on the board
        boardElement.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        });
        
        boardElement.addEventListener('dragenter', (e) => {
            e.preventDefault();
        });
        
        return {
            cleanup: () => {
                // Remove event listeners if needed
                // Note: In the React-like JSX approach, we handle this through component lifecycle
            }
        };
    },
    
    /**
     * Calculate drop position within a column
     */
    calculateDropPosition(columnElement, clientY) {
        const cards = Array.from(columnElement.querySelectorAll('.task-card'));
        
        if (cards.length === 0) {
            return { index: 0, position: 'end' };
        }
        
        for (let i = 0; i < cards.length; i++) {
            const card = cards[i];
            const rect = card.getBoundingClientRect();
            const cardCenter = rect.top + rect.height / 2;
            
            if (clientY < cardCenter) {
                return { index: i, position: 'before' };
            }
        }
        
        return { index: cards.length, position: 'after' };
    },
    
    /**
     * Add visual feedback during drag operations
     */
    addDragFeedback(element, type = 'dragging') {
        element.classList.add(`drag-${type}`);
        
        return {
            remove: () => element.classList.remove(`drag-${type}`)
        };
    },
    
    /**
     * Create a drag image for better visual feedback
     */
    createDragImage(taskElement) {
        const clone = taskElement.cloneNode(true);
        clone.style.width = taskElement.offsetWidth + 'px';
        clone.style.opacity = '0.8';
        clone.style.transform = 'rotate(5deg)';
        clone.style.position = 'absolute';
        clone.style.top = '-1000px';
        clone.style.left = '-1000px';
        clone.style.zIndex = '1000';
        clone.classList.add('drag-clone');
        
        document.body.appendChild(clone);
        
        return {
            element: clone,
            cleanup: () => {
                if (clone.parentNode) {
                    clone.parentNode.removeChild(clone);
                }
            }
        };
    },
    
    /**
     * Handle keyboard accessibility for drag and drop
     */
    setupKeyboardDragDrop(boardElement, options = {}) {
        const {
            onKeyboardMove = () => {},
            onKeyboardSelect = () => {}
        } = options;
        
        boardElement.addEventListener('keydown', (e) => {
            const focused = document.activeElement;
            const taskCard = focused.closest('.task-card');
            
            if (!taskCard) return;
            
            switch (e.key) {
                case 'ArrowUp':
                    e.preventDefault();
                    this.moveFocusVertical(taskCard, -1);
                    break;
                    
                case 'ArrowDown':
                    e.preventDefault();
                    this.moveFocusVertical(taskCard, 1);
                    break;
                    
                case 'ArrowLeft':
                    e.preventDefault();
                    this.moveFocusHorizontal(taskCard, -1);
                    break;
                    
                case 'ArrowRight':
                    e.preventDefault();
                    this.moveFocusHorizontal(taskCard, 1);
                    break;
                    
                case 'Enter':
                case ' ':
                    e.preventDefault();
                    onKeyboardSelect(taskCard);
                    break;
                    
                case 'Escape':
                    e.preventDefault();
                    taskCard.blur();
                    break;
            }
        });
    },
    
    /**
     * Move focus vertically within a column
     */
    moveFocusVertical(currentCard, direction) {
        const column = currentCard.closest('.kanban-column');
        const cards = Array.from(column.querySelectorAll('.task-card'));
        const currentIndex = cards.indexOf(currentCard);
        
        let newIndex = currentIndex + direction;
        
        if (newIndex < 0) {
            // Move to previous column's last card
            const prevColumn = column.previousElementSibling;
            if (prevColumn) {
                const prevCards = prevColumn.querySelectorAll('.task-card');
                if (prevCards.length > 0) {
                    prevCards[prevCards.length - 1].focus();
                }
            }
        } else if (newIndex >= cards.length) {
            // Move to next column's first card
            const nextColumn = column.nextElementSibling;
            if (nextColumn) {
                const nextCards = nextColumn.querySelectorAll('.task-card');
                if (nextCards.length > 0) {
                    nextCards[0].focus();
                }
            }
        } else {
            cards[newIndex].focus();
        }
    },
    
    /**
     * Move focus horizontally between columns
     */
    moveFocusHorizontal(currentCard, direction) {
        const column = currentCard.closest('.kanban-column');
        const targetColumn = direction > 0 ? 
            column.nextElementSibling : 
            column.previousElementSibling;
            
        if (targetColumn) {
            const cards = targetColumn.querySelectorAll('.task-card');
            if (cards.length > 0) {
                cards[0].focus();
            } else {
                // Focus on column header if no cards
                const header = targetColumn.querySelector('.kanban-column-title');
                if (header) header.focus();
            }
        }
    },
    
    /**
     * Validate drop operation
     */
    validateDrop(draggedTask, targetColumn, sourceColumn) {
        // Basic validation
        if (!draggedTask || !targetColumn) {
            return { valid: false, reason: 'Invalid drag operation' };
        }
        
        // Check if task is already in target column
        if (sourceColumn && sourceColumn.id === targetColumn.id) {
            return { valid: true, reason: 'Reordering within same column' };
        }
        
        // Custom validation rules can be added here
        // For example, preventing certain tasks from being moved to certain columns
        
        return { valid: true, reason: 'Valid drop operation' };
    },
    
    /**
     * Animate drop operation
     */
    animateDrop(taskElement, targetPosition) {
        return new Promise((resolve) => {
            if (!taskElement || !targetPosition) {
                resolve();
                return;
            }
            
            // Simple animation using CSS transitions
            taskElement.style.transition = 'all 0.3s ease-in-out';
            taskElement.style.transform = 'scale(0.95)';
            
            setTimeout(() => {
                taskElement.style.transform = 'scale(1)';
                setTimeout(() => {
                    taskElement.style.transition = '';
                    resolve();
                }, 300);
            }, 150);
        });
    },
    
    /**
     * Handle touch events for mobile drag and drop
     */
    setupTouchDragDrop(boardElement, options = {}) {
        let touchStart = null;
        let touchTarget = null;
        let isDragging = false;
        
        const {
            onTouchStart = () => {},
            onTouchMove = () => {},
            onTouchEnd = () => {}
        } = options;
        
        boardElement.addEventListener('touchstart', (e) => {
            const taskCard = e.target.closest('.task-card');
            if (!taskCard) return;
            
            touchStart = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY
            };
            touchTarget = taskCard;
            
            onTouchStart(taskCard, touchStart);
        });
        
        boardElement.addEventListener('touchmove', (e) => {
            if (!touchStart || !touchTarget) return;
            
            const touch = e.touches[0];
            const deltaX = touch.clientX - touchStart.x;
            const deltaY = touch.clientY - touchStart.y;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            
            if (distance > 10 && !isDragging) {
                isDragging = true;
                this.addDragFeedback(touchTarget, 'touch-dragging');
                e.preventDefault();
            }
            
            if (isDragging) {
                e.preventDefault();
                onTouchMove(touchTarget, touch);
            }
        });
        
        boardElement.addEventListener('touchend', (e) => {
            if (isDragging && touchTarget) {
                onTouchEnd(touchTarget, e.changedTouches[0]);
                touchTarget.classList.remove('drag-touch-dragging');
            }
            
            touchStart = null;
            touchTarget = null;
            isDragging = false;
        });
    }
};