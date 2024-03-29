// ==========================================================================
// Project:   Contacts.Group
// Copyright: @2014 My Company, Inc.
// ==========================================================================
/*globals Contacts */

/** @class

  (Document your Model here)

  @extends SC.Record
  @version 0.1
*/
Contacts.Group = SC.Record.extend(
	/** @scope Contacts.Group.prototype */
	{

		name: SC.Record.attr(String),

		// Each group has many contacts
		contacts: SC.Record.toMany('Contacts.Contact', {
			inverse: 'group'
		})
		// TODO: Add your own code here.

	});