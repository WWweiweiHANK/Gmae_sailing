#[derive(Clone, Copy)]
pub struct Rect {
    pub x: i32,
    pub y: i32,
    pub w: i32,
    pub h: i32,
}

// Physical coordinates, including negative origins, are used at this boundary.
pub fn recover(
    position: (i32, i32),
    size: (i32, i32),
    monitors: &[Rect],
    reset: bool,
) -> (i32, i32) {
    let fallback = Rect {
        x: 0,
        y: 0,
        w: 1920,
        h: 1080,
    };
    let area = if reset {
        monitors.first()
    } else {
        monitors.iter().find(|r| {
            position.0 + size.0 > r.x + 48
                && position.0 < r.x + r.w - 48
                && position.1 + size.1 > r.y + 48
                && position.1 < r.y + r.h - 48
        })
    }
    .or_else(|| monitors.first())
    .unwrap_or(&fallback);
    let x = if reset {
        area.x + area.w - size.0 - 24
    } else {
        position.0
    };
    let y = if reset {
        area.y + area.h - size.1 - 24
    } else {
        position.1
    };
    (
        x.clamp(area.x, (area.x + area.w - size.0).max(area.x)),
        y.clamp(area.y, (area.y + area.h - size.1).max(area.y)),
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn lost_monitor_recovers() {
        assert_eq!(
            recover(
                (4000, 900),
                (800, 800),
                &[Rect {
                    x: 0,
                    y: 0,
                    w: 1920,
                    h: 1040
                }],
                false
            ),
            (1120, 240)
        );
    }
    #[test]
    fn negative_monitor_survives() {
        assert_eq!(
            recover(
                (-1400, 100),
                (780, 810),
                &[
                    Rect {
                        x: 0,
                        y: 0,
                        w: 1920,
                        h: 1040
                    },
                    Rect {
                        x: -1920,
                        y: 0,
                        w: 1920,
                        h: 1040
                    }
                ],
                false
            ),
            (-1400, 100)
        );
    }
    #[test]
    fn oversized_window_never_panics() {
        assert_eq!(
            recover(
                (99, 99),
                (2000, 2000),
                &[Rect {
                    x: 0,
                    y: 0,
                    w: 800,
                    h: 600
                }],
                false
            ),
            (0, 0)
        );
    }
}
