const KAABA_LATITUDE = 21.4225;
const KAABA_LONGITUDE = 39.8262;
const RADIANS_PER_DEGREE = Math.PI / 180;

/**
 * Initial great-circle bearing to the Ka'bah, clockwise from true north.
 * Returns unrounded degrees in [0, 360); throws RangeError for invalid inputs.
 * Returns null when no unique bearing exists (coincident/antipodal points,
 * or a geographic pole where the local north reference is undefined).
 * Spherical model: https://www.movable-type.co.uk/scripts/latlong.html#bearing
 * No browser APIs, network requests, storage, or side effects.
 */
export function calculateQiblaBearing(latitude: number, longitude: number): number | null {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) ||
      Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    throw new RangeError("Latitude must be in [-90, 90] and longitude in [-180, 180].");
  }

  const originLatitude = latitude * RADIANS_PER_DEGREE;
  const destinationLatitude = KAABA_LATITUDE * RADIANS_PER_DEGREE;
  const longitudeDifference = (KAABA_LONGITUDE - longitude) * RADIANS_PER_DEGREE;

  const east = Math.sin(longitudeDifference) * Math.cos(destinationLatitude);
  const north = Math.cos(originLatitude) * Math.sin(destinationLatitude) -
    Math.sin(originLatitude) * Math.cos(destinationLatitude) * Math.cos(longitudeDifference);

  // Avoid assigning an arbitrary direction to floating-point singularities.
  if (Math.abs(latitude) === 90 || Math.hypot(east, north) < 1e-12) return null;

  const degrees = Math.atan2(east, north) / RADIANS_PER_DEGREE;
  return (degrees + 360) % 360;
}
