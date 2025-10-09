# Mermaid to Canvas Integration

This feature allows you to generate Mermaid diagrams through AI chat and add them directly to the canvas.

## How It Works

1. **Chat with AI**: Ask the AI to create diagrams in the chatbox on the right
2. **Mermaid Generation**: The AI generates Mermaid code for your request
3. **Add to Canvas**: Click the "Add to Canvas" button to convert and insert the diagram

## Example Prompts

Try these prompts in the chat:

```
Create a flowchart for user authentication
Show me a sequence diagram for API calls
Design a class diagram for e-commerce system
Visualize a state machine for order processing
Create an ER diagram for a blog database
Generate a Gantt chart for project timeline
```

## Features

### AI-Powered Diagram Generation
- Uses OpenRouter API with Mistral 7B (or your selected model)
- Automatically generates Mermaid code based on your description
- Supports all Mermaid diagram types

### Diagram Types Supported
- **Flowcharts**: Process flows, decision trees
- **Sequence Diagrams**: API calls, interactions
- **Class Diagrams**: System architecture, OOP designs
- **State Diagrams**: State machines, workflows
- **ER Diagrams**: Database schemas
- **Gantt Charts**: Project timelines
- **Pie Charts**: Data visualization

### Canvas Integration
- One-click conversion from Mermaid to canvas elements
- Diagrams are centered on the canvas
- Uses the `@plait-board/mermaid-to-drawnix` package
- Fully editable after insertion

## Technical Implementation

### Components

1. **ChatBox** (`/components/chatbox.tsx`)
   - AI chat interface
   - Mermaid code detection and display
   - "Add to Canvas" button for each diagram

2. **Page** (`/app/page.tsx`)
   - Manages canvas (Drawnix) instance
   - Loads mermaid-to-drawnix converter
   - Handles diagram insertion into canvas

3. **API Route** (`/app/api/chat/route.ts`)
   - Connects to OpenRouter API
   - Streams AI responses
   - Configured to generate Mermaid diagrams

### Libraries Used

- `@plait-board/mermaid-to-drawnix`: Converts Mermaid to canvas elements
- `@plait/core`: Canvas operations
- `openrouter`: AI model API
- `sonner`: Toast notifications

## Usage Example

1. Open the application
2. In the chat, type: "Create a flowchart for login process"
3. Wait for AI to generate the Mermaid code
4. Click "Add to Canvas" button
5. The diagram appears on the canvas, centered and ready to edit

## Tips

- Be specific in your requests for better diagram quality
- You can modify the Mermaid code manually if needed
- Multiple diagrams can be added from the same chat session
- All diagrams become editable elements once on the canvas

## Troubleshooting

### Diagram Not Adding to Canvas
- Make sure the canvas is loaded (wait for it to appear)
- Check browser console for errors
- Try refreshing the page

### AI Not Generating Mermaid
- Check that your OpenRouter API key is set in `.env.local`
- Try being more specific in your prompt
- Mention "create a diagram" explicitly

### Conversion Errors
- Some complex Mermaid syntax may not convert perfectly
- Try simplifying the diagram structure
- Check the Mermaid syntax is valid
