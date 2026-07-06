# App icon & splash screen assets

Place your master source images here before running the Capacitor asset
generator.  These files are **not** committed to the repository — add them
locally on the machine where you build and archive the app.

## Required files

| File | Size | Notes |
|------|------|-------|
| `icon.png` | 1024 × 1024 px | No transparency for iOS; use the Wykta logo on `#f3f8f4` background |
| `splash.png` | 2732 × 2732 px | Centered logo in a safe zone ≈ 800 × 800 px; background `#f3f8f4` |
| `icon-foreground.png` | 1024 × 1024 px | Android adaptive icon foreground layer (optional but recommended) |
| `icon-background.png` | 1024 × 1024 px | Android adaptive icon background layer (optional) |

## Generate all sizes

After placing the source files above, run:

```bash
npx @capacitor/assets generate \
  --iconBackgroundColor '#f3f8f4' \
  --splashBackgroundColor '#f3f8f4'
```

This writes all required size variants into `ios/` and `android/` automatically.

## Brand colours

| Token | Hex |
|-------|-----|
| Background / icon bg | `#f3f8f4` |
| Primary gradient start | `#34d399` |
| Primary gradient end | `#4ade80` |

See `style.css` for the full design token reference.
