document.addEventListener("DOMContentLoaded", function() {
    // Initialize background position
    const activeNavItem = document.querySelector('.nav-item.active');
    moveBackground(activeNavItem);
    
    // Attach click event listeners to nav items
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', function() {
        moveBackground(this);
      });
    });
  });
  
  function moveBackground(element) {
    // Calculate the left position for the background
    const navbarRect = document.getElementById('navbar').getBoundingClientRect();
    const itemRect = element.getBoundingClientRect();
    const offset = itemRect.left - navbarRect.left;
    
    // Set the left position of the background
    const background = document.getElementById('background');
    background.style.left = offset + 'px';
  
    // Remove the 'active' class from all elements
    let navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.classList.remove('active');
    });
  
    // Add the 'active' class to the clicked element
    element.classList.add('active');
  }
  