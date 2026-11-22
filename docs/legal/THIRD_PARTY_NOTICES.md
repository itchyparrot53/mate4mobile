# Third-party notices


The project’s MIT licence covers its own code, original SVG identity. The following retain their respective licences:

| Component | Licence / retained notice |
| --- | --- |
| Tesla vehicle renders | Copyright Tesla, Inc. and/or respective owners. Excluded from MIT; illustrative/reference use, no open-content licence claimed. See [LEGAL.md](LEGAL.md) and [asset provenance](VEHICLE-ASSETS.json). |
| Inter font | SIL Open Font License 1.1; `public/assets/INTER-LICENSE`, also copied into `brand/fonts/INTER-LICENSE`. |
| Leaflet 1.9.4, CSS and marker assets | BSD-2-Clause; `public/vendor/LEAFLET-LICENSE`. |
| node-postgres (`pg`) and transitive production packages | See package metadata and licences installed by `npm ci`; versions are locked in `package-lock.json`. |
| Fontkit | MIT; development-only font shaping and outline export. Excluded from the production image. |
| Sharp and its platform dependencies | Development-only raster export tooling; their package licences apply. They are excluded from the production image. |
| OpenStreetMap map tiles and data | Attribution is displayed in maps. [Copyright and contributors](https://www.openstreetmap.org/copyright); [tile usage policy](https://operations.osmfoundation.org/policies/tiles/). Tiles are fetched on demand, not bundled or pre-downloaded. |

TeslaMate is a separate upstream project; its server is not bundled or relicensed here. Model names describe compatibility and appearance presets. Tesla compositor images are included for vehicle identification and illustration, with source URLs and hashes in `VEHICLE-ASSETS.json`. No personal route exports or owner credentials are included.

The presence of an asset in this repository does not grant rights to third-party imagery or trademarks. See [LEGAL.md](LEGAL.md) for ownership, intended use and the distinction between attribution and permission.
