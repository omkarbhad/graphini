// Fallback JavaScript wrapper for when WASM build fails
export class MovementCalculationsWASM {
  static async load() {
    return {
      calculate_drag_offset: (currentX, currentY, originX, originY) => ({ x: currentX - originX, y: currentY - originY }),
      apply_offset: (point, offset) => [point[0] + offset.x, point[1] + offset.y],
      calculate_bounds_from_points: (points) => {
        if (points.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
        const xs = points.map(p => p[0]);
        const ys = points.map(p => p[1]);
        const minX = Math.min(...xs);
        const minY = Math.min(...ys);
        const maxX = Math.max(...xs);
        const maxY = Math.max(...ys);
        return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
      },
      calculate_adjusted_offset: (bounds, dragOffset, snapOffset, gridSize) => ({
        x: dragOffset.x + snapOffset.x,
        y: dragOffset.y + snapOffset.y
      }),
      batch_apply_offset: (points, offset) => 
        points.map(point => [point[0] + offset.x, point[1] + offset.y]),
      transform_to_viewbox: (screenPoint, viewportX, viewportY, zoom) => 
        [(screenPoint[0] - viewportX) / zoom, (screenPoint[1] - viewportY) / zoom],
      transform_to_host: (viewboxPoint, viewportX, viewportY, zoom) => 
        [viewboxPoint[0] * zoom + viewportX, viewboxPoint[1] * zoom + viewportY],
      calculate_velocity_from_points: (points, timestamps) => {
        if (points.length < 2) return 0;
        let totalVelocity = 0;
        let count = 0;
        for (let i = 1; i < points.length; i++) {
          const dx = points[i][0] - points[i-1][0];
          const dy = points[i][1] - points[i-1][1];
          const dt = timestamps[i] - timestamps[i-1];
          if (dt > 0) {
            totalVelocity += Math.sqrt(dx * dx + dy * dy) / dt;
            count++;
          }
        }
        return count > 0 ? totalVelocity / count : 0;
      },
      calculate_distance: (x1, y1, x2, y2) => {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
      }
    };
  }
}

export default MovementCalculationsWASM;
