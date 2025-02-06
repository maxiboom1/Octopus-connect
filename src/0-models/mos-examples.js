
// msg.mos.roList.story message example, as we receive it in roList 
const RoListStory = {
    storyID: 12477876,       
    storySlug: 'gaga',       
    storyNum: '',
    item: {
      itemID: '1-12',        
      itemSlug: 'אצבע - 123',
      objID: '',
      mosID: 'newsarts',
      mosExternalMetadata: {
        gfxItem: 61249,
        gfxTemplate: 90202,
        gfxProduction: 20013,
        modified: 'Plugin'
      }
    },
    mosExternalMetadata: {
      mosScope: 'story',
      mosSchema: 'octopus://STORY/EXTRA',
      mosPayload: { octext_payloadStoryExtra: [Object] }
    }
}

// Message example, as we receive it in storyReplace
const ReplaceMessage = {
    "mos": {
      "mosID": "newsarts",
      "ncsID": "octopus",
      "messageID": 28,
      "roElementAction": {
        "roID": 12150507,
        "element_target": {
          "storyID": 12477876
        },
        "element_source": {
          "story": {
            "storyID": 12477876,
            "storySlug": "gaga",
            "storyNum": "",
            "item": {
              "itemID": "1-14",
              "itemSlug": "סטרייפ מיד - ‫‫qwe",
              "objID": "",
              "mosID": "newsarts",
              "mosExternalMetadata": {
                "gfxItem": 61250,
                "gfxTemplate": 90197,
                "gfxProduction": 20013,
                "modified": "Plugin"
              }
            },
            "mosExternalMetadata": {
              "mosScope": "story",
              "mosSchema": "octopus://STORY/EXTRA",
              "mosPayload": {
                "octext_payloadStoryExtra": {
                  "cols": {
                    "col90": "STD/PKG"
                  }
                }
              }
            }
          }
        },
        "@_operation": "REPLACE"
      }
    }
}

// Message example, as we receive it in storyReplace
const InsertMessage = {
    "mos": {
      "mosID": "newsarts",
      "ncsID": "octopus",
      "messageID": 29,
      "roElementAction": {
        "roID": 12150507,
        "element_target": {
          "storyID": ""
        },
        "element_source": {
          "story": {
            "storyID": 12120388,
            "storySlug": "WELCOME",
            "storyNum": 2,
            "item": {
              "itemID": "1-4",
              "itemSlug": "אצבע - www",
              "objID": "",
              "mosID": "newsarts",
              "mosExternalMetadata": {
                "gfxItem": 61251,
                "gfxTemplate": 90202,
                "gfxProduction": 20013,
                "modified": "Plugin"
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
        "@_operation": "INSERT"
      }
    }
}

const skipMessage = { 
    "mos": 
    { "mosID": "newsarts", 
        "ncsID": "octopus", 
        "messageID": 37, 
        "octext_roStorySkip": { 
            "roID": 12150507, 
            "storyID": 12769716, 
            "skip": 1 
        } 
    } 
}