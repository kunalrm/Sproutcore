// ==========================================================================
// Project:   Contacts.Contact Fixtures
// Copyright: @2014 My Company, Inc.
// ==========================================================================
/*globals Contacts */

sc_require('models/contact_model');

Contacts.Contact.FIXTURES = [

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
    guid: 'tyler',
    firstName: 'Tyler',
    lastName: 'Keating',
    telephone: '0005551212',
    description: 'Me.',
    group: 'family'
  }, {
    guid: 'juanjuan',
    firstName: 'Juanjuan',
    lastName: 'Zhao',
    telephone: '0005552323',
    description: 'Lovely!',
    group: 'family'
  }

];