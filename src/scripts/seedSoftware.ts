import mongoose from 'mongoose';
import Software from '../models/Software';
import Expertise from '../models/Expertise';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost/tetch';
mongoose.connect(MONGO_URI, {useNewUrlParser: true});

const softwareData = [
  {
    name: 'Microsoft Office',
    subSoftware: [
      {
        name: 'Word',
        expertise: [
          {
            name: 'I am not sure',
            levels: {
              beginner: {
                from: 5,
                to: 10
              },
              intermediate: {
                from: 5,
                to: 10
              },
              advanced: {
                from: 5,
                to: 10
              },
              expert: {
                from: 5,
                to: 10
              }
            }
          },
          
          {
            name: 'Design',
            levels: {
              beginner: {
                from: 5,
                to: 10
              },
              intermediate: {
                from: 5,
                to: 10
              },
              advanced: {
                from: 10,
                to: 15
              },
              expert: {
                from: 10,
                to: 15
              }
            }
          },
          {
            name: 'Formatting',
            levels: {
              beginner: {
                from: 5,
                to: 10
              },
              intermediate: {
                from: 5,
                to: 10
              },
              advanced: {
                from: 10,
                to: 15
              },
              expert: {
                from: 10,
                to: 15
              }
            }
          },
          {
            name: 'Mailings',
            levels: {
              beginner: {
                from: 5,
                to: 10
              },
              intermediate: {
                from: 5,
                to: 10
              },
              advanced: {
                from: 10,
                to: 15
              },
              expert: {
                from: 10,
                to: 15
              }
            }
          },
          {
            name: 'Layout',
            levels: {
              beginner: {
                from: 5,
                to: 10
              },
              intermediate: {
                from: 5,
                to: 10
              },
              advanced: {
                from: 10,
                to: 15
              },
              expert: {
                from: 10,
                to: 15
              }
            }
          },
          {
            name: 'Shortcuts',
            levels: {
              beginner: {
                from: 5,
                to: 10
              },
              intermediate: {
                from: 5,
                to: 10
              },
              advanced: {
                from: 10,
                to: 15
              },
              expert: {
                from: 10,
                to: 15
              }
            }
          },
          {
            name: 'References',
            levels: {
              beginner: {
                from: 5,
                to: 10
              },
              intermediate: {
                from: 5,
                to: 10
              },
              advanced: {
                from: 10,
                to: 15
              },
              expert: {
                from: 10,
                to: 15
              }
            }
          },
          {
            name: 'Others',
            levels: {
              beginner: {
                from: 5,
                to: 10
              },
              intermediate: {
                from: 5,
                to: 10
              },
              advanced: {
                from: 5,
                to: 10
              },
              expert: {
                from: 5,
                to: 10
              }
            }
          },
          
        ]
      },
      {
        name: 'Excel',
        expertise: [
          {
            name: 'I am not sure',
            levels: {
              beginner: {
                from: 5,
                to: 10
              },
              intermediate: {
                from: 5,
                to: 10
              },
              advanced: {
                from: 5,
                to: 10
              },
              expert: {
                from: 5,
                to: 10
              }
            }
          },
          {
            name: 'Automation & Integration',
            levels: {
              beginner: {
                from: 10,
                to: 15
              },
              intermediate: {
                from: 10,
                to: 15
              },
              advanced: {
                from: 10,
                to: 15
              },
              expert: {
                from: 10,
                to: 15
              }
            }
          },
          {
            name: 'Charts & Graphs',
            levels: {
              beginner: {
                from: 10,
                to: 15
              },
              intermediate: {
                from: 10,
                to: 15
              },
              advanced: {
                from: 10,
                to: 15
              },
              expert: {
                from: 10,
                to: 15
              }
            }
          },
          {
            name: 'Excel Macros (VBA)',
            levels: {
              beginner: {
                from: 20,
                to: 30
              },
              intermediate: {
                from: 20,
                to: 30
              },
              advanced: {
                from: 20,
                to: 30
              },
              expert: {
                from: 20,
                to: 30
              }
            }
          },
          {
            name: 'Formatting',
            levels: {
              beginner: {
                from: 5,
                to: 10
              },
              intermediate: {
                from: 5,
                to: 10
              },
              advanced: {
                from: 5,
                to: 10
              },
              expert: {
                from: 5,
                to: 10
              }
            }
          },
          {
            name: 'Formulas',
            levels: {
              beginner: {
                from: 5,
                to: 10
              },
              intermediate: {
                from: 5,
                to: 10
              },
              advanced: {
                from: 5,
                to: 10
              },
              expert: {
                from: 5,
                to: 10
              }
            }
          },
          {
            name: 'Pivot Tables',
            levels: {
              beginner: {
                from: 5,
                to: 10
              },
              intermediate: {
                from: 5,
                to: 10
              },
              advanced: {
                from: 5,
                to: 10
              },
              expert: {
                from: 5,
                to: 10
              }
            }
          },
          {
            name: 'Others',
            levels: {
              beginner: {
                from: 5,
                to: 10
              },
              intermediate: {
                from: 5,
                to: 10
              },
              advanced: {
                from: 5,
                to: 10
              },
              expert: {
                from: 5,
                to: 10
              }
            }
          },


        ]
      },
    ]
  },
  {
    name: 'QuickBooks',
    expertise: [
      {
        name: 'I am not sure',
        levels: {
          beginner: {
            from: 5,
            to: 10
          },
          intermediate: {
            from: 5,
            to: 10
          },
          advanced: {
            from: 5,
            to: 10
          },
          expert: {
            from: 5,
            to: 10
          }
        }
      },
      {
        name: 'Account & Settings',
        levels: {
          beginner: {
            from: 5,
            to: 10
          },
          intermediate: {
            from: 5,
            to: 10
          },
          advanced: {
            from: 10,
            to: 15
          },
          expert: {
            from: 10,
            to: 15
          }
        }
      },
      {
        name: 'Banking',
        levels: {
          beginner: {
            from: 5,
            to: 10
          },
          intermediate: {
            from: 5,
            to: 10
          },
          advanced: {
            from: 10,
            to: 15
          },
          expert: {
            from: 10,
            to: 15
          }
        }
      },
      {
        name: 'Journal Entries',
        levels: {
          beginner: {
            from: 5,
            to: 10
          },
          intermediate: {
            from: 5,
            to: 10
          },
          advanced: {
            from: 10,
            to: 15
          },
          expert: {
            from: 10,
            to: 15
          }
        }
      },
      {
        name: 'Reconciliations',
        levels: {
          beginner: {
            from: 5,
            to: 10
          },
          intermediate: {
            from: 5,
            to: 10
          },
          advanced: {
            from: 10,
            to: 15
          },
          expert: {
            from: 10,
            to: 15
          }
        }
      },
      {
        name: 'Reports',
        levels: {
          beginner: {
            from: 5,
            to: 10
          },
          intermediate: {
            from: 5,
            to: 10
          },
          advanced: {
            from: 10,
            to: 15
          },
          expert: {
            from: 10,
            to: 15
          }
        }
      },
      {
        name: 'Sales',
        levels: {
          beginner: {
            from: 5,
            to: 10
          },
          intermediate: {
            from: 5,
            to: 10
          },
          advanced: {
            from: 10,
            to: 15
          },
          expert: {
            from: 10,
            to: 15
          }
        }
      },
      {
        name: 'Others',
        levels: {
          beginner: {
            from: 5,
            to: 10
          },
          intermediate: {
            from: 5,
            to: 10
          },
          advanced: {
            from: 5,
            to: 10
          },
          expert: {
            from: 5,
            to: 10
          }
        }
      },

    ]
  },
  {
    name: 'Google Sheets',
    expertise: [
      {
        name: 'I am not sure',
        levels: {
          beginner: {
            from: 5,
            to: 10
          },
          intermediate: {
            from: 5,
            to: 10
          },
          advanced: {
            from: 5,
            to: 10
          },
          expert: {
            from: 5,
            to: 10
          }
        }
      },

      {
        name: 'Automation & Integration',
        levels: {
          beginner: {
            from: 10,
            to: 15
          },
          intermediate: {
            from: 10,
            to: 15
          },
          advanced: {
            from: 10,
            to: 15
          },
          expert: {
            from: 10,
            to: 15
          }
        }
      },

      {
        name: 'Charts & Graphs',
        levels: {
          beginner: {
            from: 10,
            to: 15
          },
          intermediate: {
            from: 10,
            to: 15
          },
          advanced: {
            from: 10,
            to: 15
          },
          expert: {
            from: 10,
            to: 15
          }
        }
      },
      {
        name: 'Formatting',
        levels: {
          beginner: {
            from: 5,
            to: 10
          },
          intermediate: {
            from: 5,
            to: 10
          },
          advanced: {
            from: 5,
            to: 10
          },
          expert: {
            from: 5,
            to: 10
          }
        }
      },
      {
        name: 'Reports & Analysis',
        levels: {
          beginner: {
            from: 10,
            to: 15
          },
          intermediate: {
            from: 10,
            to: 15
          },
          advanced: {
            from: 10,
            to: 15
          },
          expert: {
            from: 10,
            to: 15
          }
        }
      },
      {
        name: 'Others',
        levels: {
          beginner: {
            from: 5,
            to: 10
          },
          intermediate: {
            from: 5,
            to: 10
          },
          advanced: {
            from: 5,
            to: 10
          },
          expert: {
            from: 5,
            to: 10
          }
        }
      },
    ]
  },
  {
    name: 'IT Technical Support',
    expertise: [
      {
        name: 'I am not sure',
        levels: {
          beginner: {
            from: 5,
            to: 10
          },
          intermediate: {
            from: 5,
            to: 10
          },
          advanced: {
            from: 5,
            to: 10
          },
          expert: {
            from: 5,
            to: 10
          }
        }
      },

      {
        name: 'Desktop Support',
        levels: {
          beginner: {
            from: 10,
            to: 15
          },
          intermediate: {
            from: 10,
            to: 15
          },
          advanced: {
            from: 10,
            to: 15
          },
          expert: {
            from: 10,
            to: 15
          }
        }
      },
      
      {
        name: 'Local printer, Scanner',
        levels: {
          beginner: {
            from: 10,
            to: 15
          },
          intermediate: {
            from: 10,
            to: 15
          },
          advanced: {
            from: 10,
            to: 15
          },
          expert: {
            from: 10,
            to: 15
          }
        }
      },
      {
        name: 'Network printer, Scanner',
        levels: {
          beginner: {
            from: 5,
            to: 10
          },
          intermediate: {
            from: 5,
            to: 10
          },
          advanced: {
            from: 5,
            to: 10
          },
          expert: {
            from: 5,
            to: 10
          }
        }
      },
      {
        name: 'Security',
        levels: {
          beginner: {
            from: 10,
            to: 15
          },
          intermediate: {
            from: 10,
            to: 15
          },
          advanced: {
            from: 10,
            to: 15
          },
          expert: {
            from: 10,
            to: 15
          }
        }
      },
      {
        name: 'Office365',
        levels: {
          beginner: {
            from: 10,
            to: 15
          },
          intermediate: {
            from: 10,
            to: 15
          },
          advanced: {
            from: 10,
            to: 15
          },
          expert: {
            from: 10,
            to: 15
          }
        }
      },
      {
        name: 'troubleshooting windows system and software',
        levels: {
          beginner: {
            from: 10,
            to: 15
          },
          intermediate: {
            from: 10,
            to: 15
          },
          advanced: {
            from: 10,
            to: 15
          },
          expert: {
            from: 10,
            to: 15
          }
        }
      },
      {
        name: 'Networking',
        levels: {
          beginner: {
            from: 10,
            to: 15
          },
          intermediate: {
            from: 10,
            to: 15
          },
          advanced: {
            from: 10,
            to: 15
          },
          expert: {
            from: 10,
            to: 15
          }
        }
      },
      {
        name: 'Others',
        levels: {
          beginner: {
            from: 5,
            to: 10
          },
          intermediate: {
            from: 5,
            to: 10
          },
          advanced: {
            from: 5,
            to: 10
          },
          expert: {
            from: 5,
            to: 10
          }
        }
      },
    ]
  }
];

(async () => {
  await Software.deleteMany({});
  await Expertise.deleteMany({});
  for (const data of softwareData) {
    const software = new Software({ name: data.name });
    await software.save();

    if (data.subSoftware) {
      for (const subSoftwareData of data.subSoftware) {
        const subSoftware = new Software( {
          name: subSoftwareData.name,
          parent: software._id,
        });

        await subSoftware.save();

        for (const expertiseData of subSoftwareData.expertise) {
          const expertise = new Expertise(expertiseData);

          expertise.software = subSoftware._id;
          await expertise.save();
        }
      }
    } else {
      for (const expertiseData of data.expertise) {
        const expertise = new Expertise(expertiseData);

        expertise.software = software._id;
        await expertise.save();
      }
    }
  }
  console.log('FINISH!!');
})();
