This is an interactive 3D product configurator I built using Three.js, HTML, CSS, and JavaScript. It allows users to explore multiple tech products in real time, interact with 3D models, change colours, view specifications, and control animations through a custom UI.


Features

* 4 interactive 3D GLB models (Laptop, Flip Phone, Fold Phone, EarPods)
* Real-time colour customisation using JSON-driven data
* Dynamic specs panel that updates per product
* Smooth open/close animations using pivot-based controls
* Procedural audio system built with the Web Audio API
* Video overlay system linked to product data
* Sidebar navigation with full UI control system
* Toast notifications for user feedback


How it works

All product data is stored in data/products.json and loaded dynamically using the Fetch API. The UI, 3D models, and scene are split into modular JavaScript files (ui.js, models.js, scene.js) following an MVC-style structure.


Technologies used

Three.js, WebGL, JavaScript (ES6), HTML5, CSS3, Web Audio API, Canvas API, Fetch API.


What I implemented

I handled model loading, animation logic, colour switching, UI interaction, and audio feedback. I also implemented caching for models and a system for pivot-based animations exported from Blender.