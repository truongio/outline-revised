# Article Reader - Claude Memory

## Project Overview
A beautiful, minimal article reader web application that formats articles for better readability. Built with clean typography using EB Garamond and a sophisticated editorial design.

## Live Deployment
- **URL**: https://outline-revised-l6sngzm0b-truongios-projects.vercel.app
- **GitHub**: https://github.com/truongio/outline-revised
- **Sharing format**: `?url=https://example.com/article`

## Project Structure
```
/
├── index.html          # Main HTML structure
├── style.css           # Minimal, editorial styling with EB Garamond
├── script.js           # Article extraction and URL parameter handling
├── vercel.json         # Vercel deployment configuration
└── package.json        # Project metadata
```

## Key Features
- **Typography**: EB Garamond with Palatino fallback for elegant serif styling
- **URL Parameters**: Supports `?url=` for instant article sharing
- **Auto-extraction**: Automatically processes articles when URL parameter is present
- **Responsive Design**: Mobile-optimized with clean, readable layout
- **Article Processing**: Extracts title, author, date, and main content
- **Error Handling**: Graceful handling of invalid URLs and fetch errors

## Technical Implementation
- **Frontend**: Vanilla JavaScript, CSS, HTML
- **CORS Proxy**: Uses `api.allorigins.win` for cross-origin article fetching
- **Deployment**: Vercel with static site configuration
- **Repository**: Git with GitHub integration

## Design Philosophy
Inspired by sophisticated editorial design with:
- Generous white space and optimal reading line length
- Subtle typography hierarchy
- Minimal color palette (blacks, grays, clean whites)
- Understated form elements (borderless input with underline, text-link button)
- Magazine-style article layout with centered headers

## Usage Examples
- Direct access: Visit the main URL to paste any article URL
- Shared links: `yoursite.vercel.app?url=https://danluu.com/car-safety/`
- Mobile friendly: Responsive design works across all devices

## Development Notes
- No build process required - pure static files
- Uses Google Fonts for EB Garamond
- Vercel handles routing via `vercel.json` rewrites
- Article extraction works with most standard blog/news site structures