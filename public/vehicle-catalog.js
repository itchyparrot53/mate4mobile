'use strict';
(function () {
  const models = [
  {
    "id": "m3-chrome",
    "label": "Model 3 · Original chrome trim",
    "model": "Model 3",
    "generation": "Original design · 2017–2020",
    "crop": {
      "width": 124.137931,
      "left": -6.810345,
      "top": -34.940887
    },
    "paints": [
      {
        "code": "PBSB",
        "label": "Solid Black",
        "hex": "#171819",
        "src": "/assets/vehicles/m3-chrome-PBSB.png"
      },
      {
        "code": "PPSW",
        "label": "Pearl White Multi-Coat",
        "hex": "#efefec",
        "src": "/assets/vehicles/m3-chrome-PPSW.png"
      },
      {
        "code": "PMNG",
        "label": "Midnight Silver Metallic",
        "hex": "#54565b",
        "src": "/assets/vehicles/m3-chrome-PMNG.png"
      },
      {
        "code": "PPSB",
        "label": "Deep Blue Metallic",
        "hex": "#17345d",
        "src": "/assets/vehicles/m3-chrome-PPSB.png"
      },
      {
        "code": "PPMR",
        "label": "Red Multi-Coat",
        "hex": "#8a1018",
        "src": "/assets/vehicles/m3-chrome-PPMR.png"
      }
    ]
  },
  {
    "id": "m3-black-trim",
    "label": "Model 3 · Black trim",
    "model": "Model 3",
    "generation": "Original design · 2021–2023",
    "crop": {
      "width": 175.609756,
      "left": -39.02439,
      "top": -68.571429
    },
    "paints": [
      {
        "code": "PBSB",
        "label": "Solid Black",
        "hex": "#171819",
        "src": "/assets/vehicles/m3-black-trim-PBSB.png"
      },
      {
        "code": "PPSW",
        "label": "Pearl White Multi-Coat",
        "hex": "#efefec",
        "src": "/assets/vehicles/m3-black-trim-PPSW.png"
      },
      {
        "code": "PMNG",
        "label": "Midnight Silver Metallic",
        "hex": "#54565b",
        "src": "/assets/vehicles/m3-black-trim-PMNG.png"
      },
      {
        "code": "PPSB",
        "label": "Deep Blue Metallic",
        "hex": "#17345d",
        "src": "/assets/vehicles/m3-black-trim-PPSB.png"
      },
      {
        "code": "PPMR",
        "label": "Red Multi-Coat",
        "hex": "#8a1018",
        "src": "/assets/vehicles/m3-black-trim-PPMR.png"
      }
    ]
  },
  {
    "id": "m3-refresh",
    "label": "Model 3 · Refreshed",
    "model": "Model 3",
    "generation": "Refreshed design · 2024 onwards",
    "crop": {
      "width": 175.609756,
      "left": -39.02439,
      "top": -68.571429
    },
    "paints": [
      {
        "code": "PBSB",
        "label": "Solid Black",
        "hex": "#171819",
        "src": "/assets/model-3.png"
      },
      {
        "code": "PPSW",
        "label": "Pearl White Multi-Coat",
        "hex": "#efefec",
        "src": "/assets/vehicles/m3-refresh-PPSW.png"
      },
      {
        "code": "PN01",
        "label": "Stealth Grey",
        "hex": "#4c5056",
        "src": "/assets/vehicles/m3-refresh-PN01.png"
      },
      {
        "code": "PPSB",
        "label": "Deep Blue Metallic",
        "hex": "#17345d",
        "src": "/assets/vehicles/m3-refresh-PPSB.png"
      },
      {
        "code": "PR01",
        "label": "Ultra Red",
        "hex": "#a01022",
        "src": "/assets/vehicles/m3-refresh-PR01.png"
      },
      {
        "code": "PN00",
        "label": "Quicksilver",
        "hex": "#9ba0a5",
        "src": "/assets/vehicles/m3-refresh-PN00.png"
      }
    ]
  },
  {
    "id": "my-original",
    "label": "Model Y · Original",
    "model": "Model Y",
    "generation": "Original design · 2020–2024",
    "crop": {
      "width": 163.636364,
      "left": -31.818182,
      "top": -54.577922
    },
    "paints": [
      {
        "code": "PBSB",
        "label": "Solid Black",
        "hex": "#171819",
        "src": "/assets/vehicles/my-original-PBSB.png"
      },
      {
        "code": "PPSW",
        "label": "Pearl White Multi-Coat",
        "hex": "#efefec",
        "src": "/assets/vehicles/my-original-PPSW.png"
      },
      {
        "code": "PMNG",
        "label": "Midnight Silver Metallic",
        "hex": "#54565b",
        "src": "/assets/vehicles/my-original-PMNG.png"
      },
      {
        "code": "PPSB",
        "label": "Deep Blue Metallic",
        "hex": "#17345d",
        "src": "/assets/vehicles/my-original-PPSB.png"
      },
      {
        "code": "PPMR",
        "label": "Red Multi-Coat",
        "hex": "#8a1018",
        "src": "/assets/vehicles/my-original-PPMR.png"
      }
    ]
  },
  {
    "id": "my-refresh",
    "label": "Model Y · Refreshed",
    "model": "Model Y",
    "generation": "Refreshed design · 2025 onwards",
    "crop": {
      "width": 161.797753,
      "left": -31.460674,
      "top": -53.701445
    },
    "paints": [
      {
        "code": "PX02",
        "label": "Diamond Black",
        "hex": "#151719",
        "src": "/assets/vehicles/my-refresh-PX02.png"
      },
      {
        "code": "PPSW",
        "label": "Pearl White Multi-Coat",
        "hex": "#efefec",
        "src": "/assets/vehicles/my-refresh-PPSW.png"
      },
      {
        "code": "PN01",
        "label": "Stealth Grey",
        "hex": "#4c5056",
        "src": "/assets/vehicles/my-refresh-PN01.png"
      },
      {
        "code": "PPSB",
        "label": "Deep Blue Metallic",
        "hex": "#17345d",
        "src": "/assets/vehicles/my-refresh-PPSB.png"
      },
      {
        "code": "PR01",
        "label": "Ultra Red",
        "hex": "#a01022",
        "src": "/assets/vehicles/my-refresh-PR01.png"
      },
      {
        "code": "PN00",
        "label": "Quicksilver",
        "hex": "#9ba0a5",
        "src": "/assets/vehicles/my-refresh-PN00.png"
      }
    ]
  },
  {
    "id": "ms-modern",
    "label": "Model S · Modern",
    "model": "Model S",
    "generation": "Current exterior design",
    "crop": {
      "width": 165.517241,
      "left": -32.643678,
      "top": -64.630542
    },
    "paints": [
      {
        "code": "PX02",
        "label": "Diamond Black",
        "hex": "#151719",
        "src": "/assets/vehicles/ms-modern-PX02.png"
      },
      {
        "code": "PPSW",
        "label": "Pearl White Multi-Coat",
        "hex": "#efefec",
        "src": "/assets/vehicles/ms-modern-PPSW.png"
      },
      {
        "code": "PN01",
        "label": "Stealth Grey",
        "hex": "#4c5056",
        "src": "/assets/vehicles/ms-modern-PN01.png"
      },
      {
        "code": "PB00",
        "label": "Frost Blue Metallic",
        "hex": "#6b879a",
        "src": "/assets/vehicles/ms-modern-PB00.png"
      },
      {
        "code": "PR01",
        "label": "Ultra Red",
        "hex": "#a01022",
        "src": "/assets/vehicles/ms-modern-PR01.png"
      },
      {
        "code": "PN02",
        "label": "Lunar Silver",
        "hex": "#a6adb4",
        "src": "/assets/vehicles/ms-modern-PN02.png"
      }
    ]
  },
  {
    "id": "mx-modern",
    "label": "Model X · Modern",
    "model": "Model X",
    "generation": "Current exterior design",
    "crop": {
      "width": 160.0,
      "left": -30.0,
      "top": -52.584127
    },
    "paints": [
      {
        "code": "PX02",
        "label": "Diamond Black",
        "hex": "#151719",
        "src": "/assets/vehicles/mx-modern-PX02.png"
      },
      {
        "code": "PPSW",
        "label": "Pearl White Multi-Coat",
        "hex": "#efefec",
        "src": "/assets/vehicles/mx-modern-PPSW.png"
      },
      {
        "code": "PN01",
        "label": "Stealth Grey",
        "hex": "#4c5056",
        "src": "/assets/vehicles/mx-modern-PN01.png"
      },
      {
        "code": "PB00",
        "label": "Frost Blue Metallic",
        "hex": "#6b879a",
        "src": "/assets/vehicles/mx-modern-PB00.png"
      },
      {
        "code": "PR01",
        "label": "Ultra Red",
        "hex": "#a01022",
        "src": "/assets/vehicles/mx-modern-PR01.png"
      },
      {
        "code": "PN02",
        "label": "Lunar Silver",
        "hex": "#a6adb4",
        "src": "/assets/vehicles/mx-modern-PN02.png"
      }
    ]
  }
];
  if (typeof module !== 'undefined' && module.exports) module.exports = models;
  else globalThis.TeslaVehicleCatalog = models;
})();
