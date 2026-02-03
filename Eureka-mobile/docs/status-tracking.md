# Order Status Tracking

## Statuses
- received
- preparing
- ready
- Note: received = 33%, preparing = 66%, ready = 100%


## Transitions
- Payment confirmed -> status = received (automatic)
- Staff taps "Start preparing" -> status = preparing, ETA timer starts
- Staff taps "Mark ready" -> status = ready

## ETA Countdown
- When status = received, countdown doesn't change
- When status = preparing, start countdown
  - Countdown runs against the ETA assigned at start of preparing
- Once status = ready, time automatically set to 0

