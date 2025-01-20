const keywordToTitleMap = {
    // Home Invasion
    homeInvasion: {
      title: "[Alert - Home Invasion]",
      level: "high",
      rank: 1,
      phrases: [
        "home invasion", "home intruder", "intruder in home",
        "forced entry", "forcing into", "break in", "breaking into",
        "broke into", "breaking into home", "breaking into house",
        "inside residence", "prowler spotted"
      ],
      words: [
        "intruder", "intruders", "family", "hostage", "forced", "forcing",
        "home", "house", "residence", "entry", "entries", "entered", "broke",
        "break-in", "break-ins", "prowler", "prowlers", "trespass", "trespassing"
      ]
    },

    // Shots Fired
    shotsFired: {
      title: "[Alert - Shots Fired]",
      level: "high",
      rank: 2,
      phrases: [
        "shot fired", "shots fired", "gunfire reported", "gunfire heard",
        "shooting in progress", "active shooter", "multiple shots",
        "multiple gunshots", "weapon discharged", "person shot"
      ],
      words: [
        "shot", "shots", "gunfire", "gunshots", "shooting", "shooter",
        "shootings", "discharge", "discharged", "bullet", "bullets",
        "firearm", "firearms", "rifle", "pistol", "handgun", "weapon"
      ]
    },

    // Armed Suspect
    armedSuspect: {
      title: "[Alert - Armed Suspect]",
      level: "high",
      rank: 3,
      phrases: [
        "armed suspect", "armed individual", "with weapon",
        "with gun", "with knife", "brandishing firearm",
        "knife-wielding individual", "gunman spotted",
        "armed and dangerous"
      ],
      words: [
        "armed", "arming", "suspect", "suspects", "gun", "guns",
        "firearm", "firearms", "knife", "knives", "weapon", "weapons",
        "dangerous", "hostile", "assault", "assailant", "assailants",
        "threat", "threatening"
      ]
    },

    // Robbery
    robbery: {
      title: "[Alert - Robbery]",
      level: "medium",
      rank: 4,
      phrases: [
        "armed robbery", "store robbery", "cash register stolen",
        "victim robbed", "suspect demanded money", "mugging reported"
      ],
      words: [
        "robbery", "robberies", "robbed", "cash", "money", "loot",
        "mugging", "muggings", "holdup", "hold-ups", "demand", "demanded",
        "steal", "stolen", "suspect", "suspects", "masked", "unmasked"
      ]
    },

    // Burglary
    burglary: {
      title: "[Alert - Burglary]",
      level: "medium",
      rank: 5,
      phrases: [
        "residential burglary", "commercial burglary",
        "forced entry into building", "illegal entry into property",
        "business burglary", "home break-in"
      ],
      words: [
        "burglary", "burglaries", "burglar", "burglars", "break-in",
        "break-ins", "forced", "forcing", "entry", "entries", "building",
        "property", "residence", "window", "windows", "door", "doors",
        "lock", "locks"
      ]
    },

    // Stolen Vehicle
    stolenVehicle: {
      title: "[Alert - Stolen Vehicle]",
      level: "medium",
      rank: 6,
      phrases: [
        "vehicle theft", "stolen car", "carjacking in progress",
        "license plate missing", "truck theft", "motorcycle stolen",
        "break in", "breaking in"
      ],
      words: [
        "stolen", "steal", "stealing", "vehicle", "vehicles", "car", "cars",
        "truck", "trucks", "motorcycle", "motorcycles", "bike", "bikes",
        "theft", "thefts", "license", "plate", "plates", "auto", "van",
        "vans", "pickup"
      ]
    }
  };

  module.exports = keywordToTitleMap;
