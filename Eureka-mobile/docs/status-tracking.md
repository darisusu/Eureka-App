# Order Status Tracking

## Statuses
- received
- preparing
- ready

## Transitions
- Payment confirmed -> status = received (automatic)
- Staff taps "Start preparing" -> status = preparing, ETA timer starts
- Staff taps "Mark ready" -> status = ready

## ETA Countdown
- Start countdown when status becomes preparing
- Countdown runs against the ETA assigned at start of preparing
- No countdown while in received or ready

- Once status = ready, time automatically set to 0
