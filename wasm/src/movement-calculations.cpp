#include <emscripten/emscripten.h>
#include <emscripten/bind.h>
#include <vector>
#include <cmath>
#include <algorithm>
#include <numeric>

using namespace emscripten;

// Point structure for 2D coordinates
struct Point {
    double x;
    double y;

    Point() : x(0), y(0) {}
    Point(double x, double y) : x(x), y(y) {}
};

// StrokePoint structure matching TypeScript interface
struct StrokePoint {
    Point point;
    double pressure;
    double timestamp;
    double tiltX;
    double tiltY;

    StrokePoint() : point(0, 0), pressure(0.5), timestamp(0), tiltX(0), tiltY(0) {}
    StrokePoint(Point p, double ts, double pr = 0.5, double tx = 0, double ty = 0)
        : point(p), pressure(pr), timestamp(ts), tiltX(tx), tiltY(ty) {}
};

// SmootherOptions structure
struct SmootherOptions {
    double smoothing;
    double velocityWeight;
    double curvatureWeight;
    double minDistance;
    int maxPoints;
    double pressureSensitivity;
    double tiltSensitivity;
    double velocityThreshold;
    double samplingRate;

    SmootherOptions() 
        : smoothing(0.65), velocityWeight(0.2), curvatureWeight(0.3),
          minDistance(0.2), maxPoints(8), pressureSensitivity(0.5),
          tiltSensitivity(0.3), velocityThreshold(800.0), samplingRate(5.0) {}
};

// FreehandSmoother class optimized for WASM
class FreehandSmoother {
private:
    SmootherOptions options;
    std::vector<StrokePoint> points;
    double lastProcessedTime = 0.0;
    std::vector<double> movingAverageVelocity;
    int velocityWindowSize = 3;

public:
    FreehandSmoother() : options() {}
    FreehandSmoother(SmootherOptions opts)
        : options(opts) {}

    // Main processing function - returns smoothed point or null
    Point process(Point point, double timestamp, double pressure,
                  double tiltX, double tiltY) {

        // First point - return as-is
        if (points.empty()) {
            StrokePoint strokePoint(point, timestamp, pressure, tiltX, tiltY);
            points.push_back(strokePoint);
            lastProcessedTime = timestamp;
            return point;
        }

        // Sampling rate control
        if (timestamp - lastProcessedTime < options.samplingRate) {
            double timeDiff = timestamp - lastProcessedTime;
            if (timeDiff < 2.0) {
                return Point(-999999, -999999); // null indicator
            }
        }

        StrokePoint strokePoint(point, timestamp, pressure, tiltX, tiltY);

        // Distance check with dynamic adjustment
        bool distanceOk = checkDistance(point);
        if (!distanceOk && points.size() > 1) {
            double timeDiff = timestamp - lastProcessedTime;
            if (timeDiff < 32.0) { // 32ms ≈ 30fps
                return Point(-999999, -999999); // null indicator
            }
        }

        // Update points history
        updatePoints(strokePoint);

        // Calculate dynamic parameters
        SmootherOptions dynamicParams = calculateDynamicParameters(strokePoint);

        // Apply smoothing
        Point smoothedPoint = smooth(point, dynamicParams);

        lastProcessedTime = timestamp;
        return smoothedPoint;
    }

    // Reset the smoother
    void reset() {
        points.clear();
        lastProcessedTime = 0.0;
        movingAverageVelocity.clear();
    }

    // Get current point count
    int getPointCount() {
        return points.size();
    }

private:
    void updatePoints(const StrokePoint& point) {
        points.push_back(point);
        if (points.size() > static_cast<size_t>(options.maxPoints)) {
            points.erase(points.begin());
        }
    }

    bool checkDistance(const Point& point) {
        if (points.empty()) return true;

        const Point& lastPoint = points.back().point;
        double distance = getDistance(lastPoint, point);

        // Dynamic minimum distance based on velocity
        double minDistance = options.minDistance;
        if (!movingAverageVelocity.empty()) {
            double avgVelocity = getAverageVelocity();
            minDistance *= std::max(0.5, std::min(1.5, avgVelocity / 200.0));
        }

        return distance >= minDistance;
    }

    SmootherOptions calculateDynamicParameters(const StrokePoint& strokePoint) {
        double velocity = calculateVelocity(strokePoint);
        updateMovingAverage(velocity);
        double avgVelocity = getAverageVelocity();

        SmootherOptions params = options;

        // Pressure adaptation
        if (strokePoint.pressure >= 0.0) {
            double pressureWeight = std::pow(strokePoint.pressure, 1.2);
            params.smoothing *= 1.0 - pressureWeight * params.pressureSensitivity * 0.8;
        }

        // Velocity adaptation
        double velocityFactor = std::min(avgVelocity / params.velocityThreshold, 1.0);
        params.velocityWeight = 0.2 + velocityFactor * 0.3;
        params.smoothing *= 1.0 + velocityFactor * 0.2;

        // Tilt adaptation
        if (strokePoint.tiltX >= 0.0 && strokePoint.tiltY >= 0.0) {
            double tiltFactor = std::sqrt(strokePoint.tiltX * strokePoint.tiltX +
                                        strokePoint.tiltY * strokePoint.tiltY) / 90.0;
            params.smoothing *= 1.0 + tiltFactor * params.tiltSensitivity * 0.7;
        }

        return params;
    }

    Point smooth(const Point& point, const SmootherOptions& params) {
        if (points.size() < 2) return point;

        std::vector<double> weights = calculateWeights(params);
        double totalWeight = std::accumulate(weights.begin(), weights.end(), 0.0);

        if (totalWeight == 0.0) return point;

        Point smoothedPoint(0.0, 0.0);
        for (size_t i = 0; i < points.size(); ++i) {
            double weight = weights[i] / totalWeight;
            smoothedPoint.x += points[i].point.x * weight;
            smoothedPoint.y += points[i].point.y * weight;
        }

        return smoothedPoint;
    }

    std::vector<double> calculateWeights(const SmootherOptions& params) {
        std::vector<double> weights;
        size_t lastIndex = points.size() - 1;

        for (size_t i = 0; i < points.size(); ++i) {
            // Base weight with exponential decay
            double weight = std::pow(params.smoothing, static_cast<double>(lastIndex - i) * 0.8);

            // Velocity weight
            if (i < lastIndex) {
                double velocity = getPointVelocity(i);
                weight *= 1.0 + velocity * params.velocityWeight * 0.8;
            }

            // Curvature weight
            if (i > 0 && i < lastIndex) {
                double curvature = getPointCurvature(i);
                weight *= 1.0 + curvature * params.curvatureWeight * 0.7;
            }

            weights.push_back(weight);
        }

        return weights;
    }

    double getDistance(const Point& p1, const Point& p2) {
        double dx = p2.x - p1.x;
        double dy = p2.y - p1.y;
        return std::sqrt(dx * dx + dy * dy);
    }

    double calculateVelocity(const StrokePoint& point) {
        if (points.size() < 2) return 0.0;

        const StrokePoint& prevPoint = points.back();
        double distance = getDistance(prevPoint.point, point.point);
        double timeDiff = point.timestamp - prevPoint.timestamp;
        return timeDiff > 0.0 ? distance / timeDiff : 0.0;
    }

    void updateMovingAverage(double velocity) {
        movingAverageVelocity.push_back(velocity);
        if (movingAverageVelocity.size() > static_cast<size_t>(velocityWindowSize)) {
            movingAverageVelocity.erase(movingAverageVelocity.begin());
        }
    }

    double getAverageVelocity() {
        if (movingAverageVelocity.empty()) return 0.0;
        double sum = std::accumulate(movingAverageVelocity.begin(),
                                   movingAverageVelocity.end(), 0.0);
        return sum / movingAverageVelocity.size();
    }

    double getPointVelocity(size_t index) {
        if (index >= points.size() - 1) return 0.0;

        const StrokePoint& p1 = points[index];
        const StrokePoint& p2 = points[index + 1];
        double distance = getDistance(p1.point, p2.point);
        double timeDiff = p2.timestamp - p1.timestamp;
        return timeDiff > 0.0 ? distance / timeDiff : 0.0;
    }

    double getPointCurvature(size_t index) {
        if (index <= 0 || index >= points.size() - 1) return 0.0;

        const Point& p1 = points[index - 1].point;
        const Point& p2 = points[index].point;
        const Point& p3 = points[index + 1].point;

        double a = getDistance(p1, p2);
        double b = getDistance(p2, p3);
        double c = getDistance(p1, p3);

        double s = (a + b + c) / 2.0;
        double area = std::sqrt(std::max(0.0, s * (s - a) * (s - b) * (s - c)));
        return (4.0 * area) / (a * b * c + 0.0001); // Avoid division by zero
    }
};

// Utility functions for general movement calculations
EMSCRIPTEN_KEEPALIVE
extern "C" {

// Distance calculation
double calculate_distance(double x1, double y1, double x2, double y2) {
    double dx = x2 - x1;
    double dy = y2 - y1;
    return std::sqrt(dx * dx + dy * dy);
}

// Velocity calculation
double calculate_velocity(double distance, double time_diff) {
    return time_diff > 0.0 ? distance / time_diff : 0.0;
}

// Moving average
double calculate_moving_average(std::vector<double> values) {
    if (values.empty()) return 0.0;
    double sum = 0.0;
    for (double val : values) {
        sum += val;
    }
    return sum / values.size();
}

// Curvature calculation
double calculate_curvature(double x1, double y1, double x2, double y2, double x3, double y3) {
    double a = calculate_distance(x1, y1, x2, y2);
    double b = calculate_distance(x2, y2, x3, y3);
    double c = calculate_distance(x1, y1, x3, y3);

    double s = (a + b + c) / 2.0;
    double area = std::sqrt(std::max(0.0, s * (s - a) * (s - b) * (s - c)));
    return (4.0 * area) / (a * b * c + 0.0001);
}

// Exponential weight calculation
double calculate_exponential_weight(double base, int index, double decay) {
    return std::pow(base, static_cast<double>(index) * decay);
}

}

// Movement calculation utilities (outside extern "C" for proper C++ binding)
struct Offset {
    double x;
    double y;
};

struct Bounds {
    double minX;
    double minY;
    double maxX;
    double maxY;
    double width;
    double height;
};

// Calculate drag offset from origin
Offset calculate_drag_offset(double currentX, double currentY, double originX, double originY) {
    return { currentX - originX, currentY - originY };
}

// Apply offset to position
Point apply_offset(Point point, Offset offset) {
    return { point.x + offset.x, point.y + offset.y };
}

// Calculate bounds from points
Bounds calculate_bounds_from_points(std::vector<Point> points) {
    if (points.empty()) {
        return { 0, 0, 0, 0, 0, 0 };
    }
    
    double minX = points[0].x, minY = points[0].y;
    double maxX = points[0].x, maxY = points[0].y;
    
    for (const auto& point : points) {
        minX = std::min(minX, point.x);
        minY = std::min(minY, point.y);
        maxX = std::max(maxX, point.x);
        maxY = std::max(maxY, point.y);
    }
    
    return { minX, minY, maxX, maxY, maxX - minX, maxY - minY };
}

// Calculate adjusted offset with snap and grid
Offset calculate_adjusted_offset(
    Bounds commonBounds,
    Offset dragOffset,
    Offset snapOffset,
    double gridSize
) {
    double nextX = commonBounds.minX + dragOffset.x + snapOffset.x;
    double nextY = commonBounds.minY + dragOffset.y + snapOffset.y;
    
    // Apply grid snapping if no object snapping occurred
    if (snapOffset.x == 0.0 && gridSize > 0.0) {
        nextX = std::round(nextX / gridSize) * gridSize;
    }
    if (snapOffset.y == 0.0 && gridSize > 0.0) {
        nextY = std::round(nextY / gridSize) * gridSize;
    }
    
    return {
        nextX - commonBounds.minX,
        nextY - commonBounds.minY
    };
}

// Batch update multiple points with same offset
std::vector<Point> batch_apply_offset(std::vector<Point> points, Offset offset) {
    std::vector<Point> result;
    result.reserve(points.size());
    
    for (const auto& point : points) {
        result.push_back({ point.x + offset.x, point.y + offset.y });
    }
    
    return result;
}

// Coordinate transformation utilities
Point transform_to_viewbox(
    Point screenPoint,
    double viewportX,
    double viewportY,
    double zoom
) {
    return {
        (screenPoint.x - viewportX) / zoom,
        (screenPoint.y - viewportY) / zoom
    };
}

Point transform_to_host(
    Point viewboxPoint,
    double viewportX,
    double viewportY,
    double zoom
) {
    return {
        viewboxPoint.x * zoom + viewportX,
        viewboxPoint.y * zoom + viewportY
    };
}

// Calculate velocity from multiple points
double calculate_velocity_from_points(
    std::vector<Point> points,
    std::vector<double> timestamps
) {
    if (points.size() < 2 || timestamps.size() < 2) {
        return 0.0;
    }
    
    double totalDistance = 0.0;
    for (size_t i = 1; i < points.size(); ++i) {
        double dx = points[i].x - points[i-1].x;
        double dy = points[i].y - points[i-1].y;
        totalDistance += std::sqrt(dx * dx + dy * dy);
    }
    
    double totalTime = timestamps.back() - timestamps.front();
    return totalTime > 0.0 ? totalDistance / totalTime : 0.0;
}

// Emscripten bindings
EMSCRIPTEN_BINDINGS(movement_calculations) {
    value_object<Point>("Point")
        .field("x", &Point::x)
        .field("y", &Point::y);

    value_object<StrokePoint>("StrokePoint")
        .field("point", &StrokePoint::point)
        .field("pressure", &StrokePoint::pressure)
        .field("timestamp", &StrokePoint::timestamp)
        .field("tiltX", &StrokePoint::tiltX)
        .field("tiltY", &StrokePoint::tiltY);

    value_object<SmootherOptions>("SmootherOptions")
        .field("smoothing", &SmootherOptions::smoothing)
        .field("velocityWeight", &SmootherOptions::velocityWeight)
        .field("curvatureWeight", &SmootherOptions::curvatureWeight)
        .field("minDistance", &SmootherOptions::minDistance)
        .field("maxPoints", &SmootherOptions::maxPoints)
        .field("pressureSensitivity", &SmootherOptions::pressureSensitivity)
        .field("tiltSensitivity", &SmootherOptions::tiltSensitivity)
        .field("velocityThreshold", &SmootherOptions::velocityThreshold)
        .field("samplingRate", &SmootherOptions::samplingRate);

    class_<FreehandSmoother>("FreehandSmoother")
        .constructor<>()
        .constructor<SmootherOptions>()
        .function("process", &FreehandSmoother::process)
        .function("reset", &FreehandSmoother::reset)
        .function("getPointCount", &FreehandSmoother::getPointCount);

    // Utility function bindings
    function("calculate_distance", &calculate_distance);
    function("calculate_velocity", &calculate_velocity);
    function("calculate_moving_average", &calculate_moving_average);
    function("calculate_curvature", &calculate_curvature);
    function("calculate_exponential_weight", &calculate_exponential_weight);

    // Movement calculation bindings
    value_object<Offset>("Offset")
        .field("x", &Offset::x)
        .field("y", &Offset::y);

    value_object<Bounds>("Bounds")
        .field("minX", &Bounds::minX)
        .field("minY", &Bounds::minY)
        .field("maxX", &Bounds::maxX)
        .field("maxY", &Bounds::maxY)
        .field("width", &Bounds::width)
        .field("height", &Bounds::height);

    function("calculate_drag_offset", &calculate_drag_offset);
    function("apply_offset", &apply_offset);
    function("calculate_bounds_from_points", &calculate_bounds_from_points);
    function("calculate_adjusted_offset", &calculate_adjusted_offset);
    function("batch_apply_offset", &batch_apply_offset);
    function("transform_to_viewbox", &transform_to_viewbox);
    function("transform_to_host", &transform_to_host);
    function("calculate_velocity_from_points", &calculate_velocity_from_points);

    // Register vector types for Emscripten
    register_vector<double>("VectorDouble");
    register_vector<Point>("VectorPoint");
}
