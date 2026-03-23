# 🏖️ Sand Castle Builder

An interactive 3D math tool for students to build virtual sand castles, practice volume calculations, and present their work to the class.

## Features

- **4 shape types**: Sphere, Hemisphere, Cylinder, Cone — each with the correct volume formula displayed
- **3D drag-and-place**: Move your mouse over the sand to position shapes, click to place
- **Physics engine**: Shapes can't float, limited overhang (so towers don't tip over)
- **Sand budget**: 5,000 cm³ total — students must plan their design
- **Auto-save**: Work is saved in browser localStorage — refreshing won't lose progress
- **Presentation mode**: 
  - 360° auto-rotation view
  - Students enter their calculated volume
  - Immediate feedback (correct / close / try again)
  - Step-by-step formula breakdown

## Math Concepts Covered

| Shape | Formula |
|-------|---------|
| Sphere | V = (4/3)πr³ |
| Hemisphere | V = (2/3)πr³ |
| Cylinder | V = πr²h |
| Cone | V = (1/3)πr²h |

## Deploy to GitHub Pages

### Option 1: Automatic (GitHub Actions)

1. Push this repo to GitHub
2. Go to Settings → Pages → set source to "GitHub Actions"
3. The included workflow will build and deploy automatically on every push

### Option 2: Manual

```bash
npm install
npm run deploy   # runs next build + next export
# Upload the 'out' folder to your GitHub Pages branch
```

### Setting a custom base path

If your repo is at `github.com/username/sandcastle`, GitHub Pages will serve it at `username.github.io/sandcastle`. Edit `next.config.js` and uncomment:

```js
basePath: '/sandcastle',
```

## Local Development

```bash
npm install
npm run dev
# Open http://localhost:3000
```

## Classroom Tips

- Assign a sand budget (default 5,000 cm³ — adjust `MAX_SAND` in `lib/store.js`)
- Have students sketch their castle plan on paper first, then calculate volumes before building
- Use Presentation Mode during share-outs — the 360° view works great on a projector
- Students can enter their calculated answer and get instant feedback
