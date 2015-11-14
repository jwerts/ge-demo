graph LR

A[Select Route] --> B[Explode paths]
B --> C[Select Path]
C --> D[Mouse Snap Handler]
D --> E[Click point on line]
E --> F{point count?}
F -->|first point| G[Create point on line]
F -->|second point| H[Create point on line]
H --> I[Remove mouse snap handler]
I --> J[Select exploded portion of polyline]
