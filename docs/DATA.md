# What the readings mean


Mate4Mobile displays TeslaMate records. It does not poll Tesla, wake the car, recalculate every upstream value or create missing telemetry.

- **Latest reading:** A timestamped observation, potentially older while the vehicle sleeps. The home screen labels its age.
- **Today/activity:** Completed sessions grouped by completion time in the configured IANA timezone. An overnight charge belongs to the day it finishes. Open sessions are shown separately.
- **Battery history:** Recorded positions plus charging samples, retaining actual timestamps, endpoints, extrema and gaps. Long asleep/offline gaps are not filled with invented readings.
- **Journey charts:** Up to 600 retained telemetry points and 250 route points. Chart inspection uses the recording’s time and position. A GPS gap or missing signal can leave a chart discontinuity.
- **Charging periods:** 7, 30 or 90 local calendar days, grouped by session completion. Missing costs remain absent; free sessions remain zero. Coverage tells you when a spend total is partial.
- **Tariffs:** The current geofence tariff is descriptive. It is not retrospectively applied to historical sessions and can differ from recorded cost.
- **Added/used energy:** TeslaMate’s stored values, not an independent wall-meter measurement. Their ratio can be affected by recording quality.
- **Battery estimates:** Full rated range and inferred capacity depend on recorded range/charging and conditions. A “longer-term picture” label uses a UI heuristic of at least 14 days and five qualifying charges; it is not a health certification or degradation diagnosis.
- **Consumption:** Availability depends on TeslaMate’s own efficiency calibration. The viewer avoids presenting unsupported consumption values when that calibration is absent.
- **Currency:** A formatting setting only. It must match the units of stored costs; no exchange-rate conversion is performed.
- **Vehicle artwork:** A device-local display preference, not an automatic identification of exact trim or model year. Vehicle renders are Tesla artwork used for identification and illustration; see [LEGAL.md](legal/LEGAL.md).

One configured car is shown per app instance. The default is the first car by ID; set `CAR_ID` explicitly for a multi-car database. The public synthetic demo has no connection to actual telemetry.
