# Creating Bot event

event should be placed in an appropriate subdirectory under `src/events`. For example, you might create a file at `src/events/ready/consoleLog.ts` for a development command.

## Loading and Registration

### Dynamic Loading

The module `src/handlers/eventHandler.ts` performs the following steps:

1. **Discovery:**  
   It scans the `src/events` directory recursively for subfolders and files. Each subfolder name is assumed to map to a Discord.js event.

2. **Validation:**  
   Before processing a file, a helper function (`isValidEventName` in `src/utils/validators/isValidEventName.ts`) confirms whether the parent folder name is a valid Discord.js event.

3. **Caching:**  
   Loaded event modules are stored in an LRUCache to avoid redundant imports. If an event module is already cached, it is immediately registered without reimporting.

4. **Priority Sorting:**  
   Once all event handlers for a particular event are loaded, they are sorted by priority. In the current implementation, handlers are sorted in descending order based on their `priority` values:
   ```typescript
   handlers.sort((a, b) => b.priority - a.priority);
   ```
   This means events with a higher numeric priority are invoked first.

5. **Event Attachment:**  
   Each event is registered with the Discord client using `client.on(...)`. When the event fires, all associated handlers are executed in the determined order. If an error occurs in any handler, it is caught and passed to the global error handler.

### Error Handling

- **Invalid Handlers:**  
  If an event handler does not export a function or fails validation, an `EventError` (defined in `src/types/events.ts`) is thrown.
  
- **Global Error Processing:**  
  All errors during loading or event handling are forwarded to the global error handler (`global.errorHandler`). Check the error logs or your error webhook for detailed reports.

## Best Practices

- **File Placement:**  
  Place your event files in a subdirectory under `src/events` named after the Discord event. This ensures the event loader correctly maps your file to the corresponding event.

- **Handler Signature:**  
  Each handler should match the following signature:
  ```typescript
  (client: Client, ...args: unknown[]) => Promise<void> | void;
  ```
  For better type safety with specific events, consider using the `TypedEventHandler` type.

- **Priority Use:**  
  If multiple handlers for the same event exist, leverage the optional `priority` property to control execution order.

