const storyCacheExample = {
    "rundownSlug": {
        "storyID": {
            "uid": "41999",
            "storyID": 123456,
            "name": "anveks4ever",
            "number": 123,
            "ord": 0,
            "production":123,
            "rundown":123,
            "item": [
                {
                    "itemID": '1-1',
                    "itemSlug": 'מגירה 1 - Box-11',
                    "objID": '',
                    "mosID": 'newsarts',
                    "mosExternalMetadata": {
                        "gfxItem": 60832,
                        "gfxTemplate": 90199,
                        "gfxProduction": 20013
                    },
                    ord:0
                }
            // Other Items
            ],  
        }
        // Other stories 
    }
    // Other rundowns
}

const rundownsListExample = {
    "Morning 10/17/2024 07:00": {
        "uid": "10073",
        "production": 2,
        "roID": 8208105
    }
}

const insertExample = {
    "mos": {
      "mosID": "newsarts",
      "ncsID": "octopus",
      "messageID": "50",
      "roElementAction": {
        "roID": "8208105",
        "element_target": {
          "storyID": "8768972"
        },
        "element_source": {
          "story": {
            "storyID": "8768974",
            "storySlug": "STRIPE-2",
            "storyNum": "",
            "item": {
              "itemID": "3-1",
              "itemSlug": "סטרייפ - ‫asd",
              "objID": "",
              "mosID": "newsarts",
              "mosExternalMetadata": {
                "gfxItem": "60842",
                "gfxTemplate": "90194",
                "gfxProduction": "20013"
              }
            },
            "mosExternalMetadata": {
              "mosScope": "story",
              "mosSchema": "octopus://STORY/EXTRA",
              "mosPayload": {
                "octext_payloadStoryExtra": {
                  "cols": {
                    "col90": "STD"
                  }
                }
              }
            }
          }
        },
        "_operation": "INSERT"
      }
    }
}