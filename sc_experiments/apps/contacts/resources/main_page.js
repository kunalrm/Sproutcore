// ==========================================================================
// Project:   Contacts - mainPage
// Copyright: @2014 My Company, Inc.
// ==========================================================================
/*globals Contacts */

// This page describes the main user interface for your application.
Contacts.mainPage = SC.Page.design({

  // The main pane is made visible on screen as soon as your app is loaded.
  // Add childViews to this pane for views to display immediately on page
  // load.
  mainPane: SC.MainPane.design({
    childViews: ['toolbarView', 'splitView'],

    // This is the topbar
    toolbarView: SC.ToolbarView.design({
      childViews: ['titleView'],

      titleView: SC.LabelView.design({
        controlSize: SC.LARGE_CONTROL_SIZE,
        layout: {
          centerY: 0,
          height: 24,
          left: 10,
          width: 200
        },
        value: "Contacts"
      })
    }),

    // This is the split view
    splitView: SC.SplitView.design({

      // Place this below the toolbar
      layout: {
        top: 32
      },

      childViews: ['groupsTab', 'contactsTab', 'detailsTab'],

      groupsTab: SC.View.design(SC.SplitChild, {
        minimumSize: 200,
        size: 250,

        childViews: ['list', 'controlBar'],
        list: SC.ScrollView.design({
          layout: {
            bottom: 44
          },
          contentView: SC.ListView.design({
            content: ["A", "B", "C", "D", "E", "F"]
          })
        }),
        controlBar: SC.ToolbarView.design({
          anchorLocation: SC.ANCHOR_BOTTOM,
          childViews: ['addButton', 'removeButton'],
          // add button
          addButton: SC.ButtonView.design({
            controlSize: SC.HUGE_CONTROL_SIZE,
            layout: {
              centerY: 0,
              left: 10,
              width: 40,
              height: 30
            },
            title: '+'
          }),
          // remove button
          removeButton: SC.ButtonView.design({
            controlSize: SC.HUGE_CONTROL_SIZE,
            layout: {
              centerY: 0,
              left: 60,
              width: 40,
              height: 30
            },
            title: '-'
          })
        })
      }),

      contactsTab: SC.View.design(SC.SplitChild, {
        minimumSize: 200,
        size: 250,

        childViews: ['list', 'controlBar'],
        // list
        list: SC.ScrollView.design({
          layout: {
            bottom: 44
          },
          contentView: SC.ListView.design({
            content: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]
          })
        }),
        // control
        controlBar: SC.ToolbarView.design({
          anchorLocation: SC.ANCHOR_BOTTOM,
          childViews: ['addButton', 'removeButton'],
          // add button
          addButton: SC.ButtonView.design({
            controlSize: SC.HUGE_CONTROL_SIZE,
            layout: {
              centerY: 0,
              left: 10,
              width: 40,
              height: 30
            },
            title: '+'
          }),
          // remove button
          removeButton: SC.ButtonView.design({
            controlSize: SC.HUGE_CONTROL_SIZE,
            layout: {
              centerY: 0,
              left: 60,
              width: 40,
              height: 30
            },
            title: '-'
          })
        })
      }),

      detailsTab: SC.View.design(SC.SplitChild, {
        autoResizeStyle: SC.RESIZE_AUTOMATIC,
        minimumSize: 400,

        childViews: ['fullName', 'telNumber', 'description',
          'controlBar'
        ],

        // name
        fullName: SC.LabelView.design({
          layout: {
            left: 160,
            top: 50,
            height: 25,
            width: 150
          },
          value: "Tyler Keating"
        }),
        // number
        telNumber: SC.LabelView.design({
          layout: {
            left: 160,
            top: 75,
            height: 25,
            width: 100
          },
          value: "(000) 555-1212"
        }),
        // description
        description: SC.TextFieldView.design({
          isEditable: false,
          isTextArea: true,
          layout: {
            left: 20,
            top: 160,
            bottom: 52,
            right: 20
          },
          value: "Author of the amazing Beginner's Guide to SproutCore book and just generally an all around nice human being."
        }),
        // the controlbar
        controlBar: SC.ToolbarView.design({
          anchorLocation: SC.ANCHOR_BOTTOM,
          childViews: ['editButton'],
          editButton: SC.ButtonView.design({
            layout: {
              centerY: 0,
              right: 10,
              width: 80,
              height: 24
            },
            title: 'Edit'
          })
        })
      })
    })
  })
});