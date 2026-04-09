# NoteDown
A simple Note Taking App.

### What it has:-

- 2 kind of Note taking ( Markdown, Canvas ).
- Both of the notes data is stored in Indexed DB inside your Browser.
- Markdown Support general Syntax like Headings, bullets, font-styles, image, etc.
- Canvas Support basic drawing tools like:
  - Line
  - Rectangle
  - Ellipse/Circle
  - Arrow/Curved Arrow
  - Eraser
  - Moving Shapes
  - Infinite Panning
  - Shape Linker
  - Color Selector
- Other Tools like:
  - Undo/Redo
  - Collabration (only for Canvas, little slow and data consuming )
  - Light & Dark Mode


- Regarding Collabration Tool:
  - It can be used for one2one , one2many, many2one, many2many collabration.
  - The Shared canvas isn't stored on the both end only the client side.
  - The ID for the collabration should be unique.
  - Refresh Disconnects the sharing.
