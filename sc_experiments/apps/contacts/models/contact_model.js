// ==========================================================================
// Project:   Contacts.Contact
// Copyright: @2014 My Company, Inc.
// ==========================================================================
/*globals Contacts */

/** @class

  (Document your Model here)

  @extends SC.Record
  @version 0.1
*/
Contacts.Contact = SC.Record.extend(
	/** @scope Contacts.Contact.prototype */
	{

		// TODO: Add your own code here.
		firstName: SC.Record.attr(String),

		LastName: SC.Record.attr(String),

		telephone: SC.Record.attr(String),

		description: SC.Record.attr(String),

		// Each contact belongs to one group
		group: SC.Record.toOne('Contacts.Group', {
			inverse: 'contacts'
		})

	});