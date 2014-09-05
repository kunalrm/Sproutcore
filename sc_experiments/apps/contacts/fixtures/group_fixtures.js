// ==========================================================================
// Project:   Contacts.Group Fixtures
// Copyright: @2014 My Company, Inc.
// ==========================================================================
/*globals Contacts */

sc_require('models/group_model');

Contacts.Group.FIXTURES = [

  // TODO: Add your data fixtures here.
  // All fixture records must have a unique primary key (default 'guid').  See 
  // the example below.

  // { guid: 1,
  //   firstName: "Michael",
  //   lastName: "Scott" },
  //
  // { guid: 2,
  //   firstName: "Dwight",
  //   lastName: "Schrute" },
  //
  // { guid: 3,
  //   firstName: "Jim",
  //   lastName: "Halpert" },
  //
  // { guid: 4,
  //   firstName: "Pam",
  //   lastName: "Beesly" },
  //
  // { guid: 5,
  //   firstName: "Ryan",
  //   lastName: "Howard" }
  {
    guid: 'family',
    name: 'Family',
    contacts: ['tyler', 'juanjuan']
  }

];