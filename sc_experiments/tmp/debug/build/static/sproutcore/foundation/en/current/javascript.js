/* >>>>>>>>>> BEGIN source/core.js */

/**
  If true, then all SC.Controls can be focused when the
  user presses the tab key. Otherwise, only TextFieldViews
  will be focused.

  @type String
  @constant
*/
SC.FOCUS_ALL_CONTROLS = NO;

/*
  TODO [CC @ 1.5] Remove this deprecation warning eventually
*/
SC.ready(function() {
  var focus = SC.SAFARI_FOCUS_BEHAVIOR;
  if (focus !== null && focus !== undefined) {
    
    SC.Logger.warn("SC.SAFARI_FOCUS_BEHAVIOR is deprecated. Please use SC.FOCUS_ALL_CONTROLS instead");
    
    SC.FOCUS_ALL_CONTROLS = SC.SAFARI_FOCUS_BEHAVIOR;
  }
});

/* >>>>>>>>>> BEGIN source/mixins/tree_item_content.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/**
  @namespace

  A tree item is a model object that acts as a node in a tree-like data
  structure such as a hierarchy of folders or outline of items.  This mixin
  can be applied to tree item model objects to customize the way the tree
  information is extracted from the object.

  ## Basic Implementation

  If you add this mixin, you must implement the treeItemChildren property so
  that it returns the current array of child tree items for the receiver.  If
  you do not implement this property the tree item will not function.

  ## Optimizing Branches

  The most common use of this mixin is to override the treeItemBranchIndexes
  property to return an index set of child items that are themselves branches
  in the tree.  Normally the TreeController will need to walk every item in
  your list to determine these branch items.  However by implementing this
  method yourself, you can provide a result faster.

  If none of your child items are branches, override this property to return
  null or an empty index set.

  @since SproutCore 1.0
*/
SC.TreeItemContent = {

  /**
    Walk like a duck.

    @type Boolean
    @default YES
  */
  isTreeItemContent: YES,

  /**
    Property returns the children for this tree item.  The default simply
    returns null.  If you implement this mixin, you MUST implement this
    property to return the actual tree item children for the item.

    @type SC.Array
    @default null
  */
  treeItemChildren: null,

  /**
    The default property used to determine if the tree item is expanded.  You
    can implement you model object to update this property or you can override
    treeItemDisclosureState() to compute the disclosure state however you
    want.

    @type Boolean
    @default YES
  */
  treeItemIsExpanded: YES,

  /**
    Indicates whether the tree item should be rendered as a group or not.
    This property is only useful on the root item in your tree.  Setting it to
    YES on any other item will be ignored.

    @type Boolean
    @default NO
  */
  treeItemIsGrouped: NO,

  /**
    Returns the disclosure state for the tree item, which appears at the
    index of the parent's treeItemChildren array.  The response must be one of
    SC.BRANCH_OPEN, SC.BRANCH_CLOSED or SC.LEAF_NODE.

    If the parent parameter is null, then this item is part of the root
    children array.

    This method will only be called for tree items that have children.  Tree
    items with no children are assumed to be leaf nodes.

    The default implementation uses the treeItemIsExpanded property to
    determine if the item should be open or closed.

    @param {Object} parent the parent item containing this item
    @param {Number} idx the index of the item in the parent
    @returns {Number} branch state
  */
  treeItemDisclosureState: function(parent, idx) {
    return this.get('treeItemIsExpanded') ? SC.BRANCH_OPEN : SC.BRANCH_CLOSED;
  },

  /**
    Collapse the tree item.  The default implementation will change the
    treeItemIsExpanded property, but you can override this method to handle
    collapsing anyway you like.

    @param {Object} parent the parent item containing this item
    @param {Number} idx the index of the item in the parent
    @returns {void}
  */
  treeItemCollapse: function(parent, idx) {
    this.setIfChanged('treeItemIsExpanded', NO);
  },

  /**
    Expand the tree item.  The default implementation will change the
    treeItemIsExpanded property, but you can override this method to handle
    collapsing anyway you like.

    @param {Object} parent the parent item containing this item
    @param {Number} idx the index of the item in the parent
    @returns {void}
  */
  treeItemExpand: function(parent, idx) {
    this.setIfChanged('treeItemIsExpanded', YES);
  },

  /**
    Returns an index set containing the child indexes of the item that are
    themselves branches.  This will only be called on tree items with a branch
    disclosure state.

    If the passed parent and index are both null, then the receiver is the
    root node in the tree.

    The default implementation iterates over the item's children to get the
    disclosure state of each one.  Child items with a branch disclosure state
    will have their index added to the return index set.

    You may want to override this method to provide a more efficient
    implementation if you are working with large data sets and can infer which
    children are branches without iterating over each one.

    If you know for sure that all of the child items for this item are leaf
    nodes and not branches, simply override this method to return null.

    @param {Object} parent the parent item containing this item
    @param {Number} index the index of the item in the parent
    @returns {SC.IndexSet} branch indexes
  */
  treeItemBranchIndexes: function(parent, index) {
    var children = this.get('treeItemChildren'),
        ret, lim, idx, item;

    if (!children) return null ; // nothing to do

    ret = SC.IndexSet.create();
    lim = children.get('length');
    for(idx=0;idx<lim;idx++) {
      if (!(item = children.objectAt(idx))) continue;
      if (!item.get('treeItemChildren')) continue;
      if (item.treeItemDisclosureState(this,idx)!==SC.LEAF_NODE) ret.add(idx);
    }

    return ret.get('length')>0 ? ret : null;
  }

};

/* >>>>>>>>>> BEGIN source/mixins/collection_content.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/**
  Used for contentIndexDisclosureState().  Indicates open branch node.

  @type Number
  @constant
*/
SC.BRANCH_OPEN = 0x0011;

/**
  Used for contentIndexDisclosureState().  Indicates closed branch node.

  @type Number
  @constant
*/
SC.BRANCH_CLOSED = 0x0012;

/**
  Used for contentIndexDisclosureState().  Indicates leaf node.

  @type Number
  @constant
*/
SC.LEAF_NODE = 0x0020;

/**
  @namespace

  This mixin provides standard methods used by a CollectionView to provide
  additional meta-data about content in a collection view such as selection
  or enabled state.

  You can apply this mixin to a class that you set as a delegate or to the
  object you set as content.

  @since SproutCore 1.0
*/
SC.CollectionContent = {

  /**
    Used to detect the mixin by SC.CollectionView

    @type Boolean
  */
  isCollectionContent: YES,

  /**
    Return YES if the content index should be selected.  Default behavior
    looks at the selection property on the view.

    @param {SC.CollectionView} collection the collection view
    @param {SC.Array} content the content object
    @param {Number} idx the content index
    @returns {Boolean} YES, NO, or SC.MIXED_STATE
  */
  contentIndexIsSelected: function(collection, content, idx) {
    var sel = collection.get('selection');
    return sel ? sel.contains(content, idx) : NO ;
  },

  /**
    Returns YES if the content index should be enabled.  Default looks at the
    isEnabled state of the collection view.

    @param {SC.CollectionView} collection the collection view
    @param {SC.Array} content the content object
    @param {Number} idx the content index
    @returns {Boolean} YES, NO, or SC.MIXED_STATE
  */
  contentIndexIsEnabled: function(collection, content, idx) {
    return collection.get('isEnabled');
  },

  // ..........................................................
  // GROUPING
  //

  /**
    Optionally return an index set containing the indexes that may be group
    views.  For each group view, the delegate will actually be asked to
    confirm the view is a group using the contentIndexIsGroup() method.

    If grouping is not enabled, return null.

    @param {SC.CollectionView} collection the calling view
    @param {SC.Array} content the content object
    @return {SC.IndexSet}
  */
  contentGroupIndexes: function(collection, content) {
    return null;
  },

  /**
    Returns YES if the item at the specified content index should be rendered
    using the groupExampleView instead of the regular exampleView.  Note that
    a group view is different from a branch/leaf view.  Group views often
    appear with different layout and a different look and feel.

    Default always returns NO.

    @param {SC.CollectionView} collection the collection view
    @param {SC.Array} content the content object
    @param {Number} idx the content index
    @returns {Boolean} YES, NO, or SC.MIXED_STATE
  */
  contentIndexIsGroup: function(collection, content, idx) {
    return NO ;
  },

  // ..........................................................
  // OUTLINE VIEWS
  //

  /**
    Returns the outline level for the item at the specified index.  Can be
    used to display hierarchical lists.

    Default always returns -1 (no outline).

    @param {SC.CollectionView} collection the collection view
    @param {SC.Array} content the content object
    @param {Number} idx the content index
    @returns {Boolean} YES, NO, or SC.MIXED_STATE
  */
  contentIndexOutlineLevel: function(collection, content, idx) {
    return -1;
  },

  /**
    Returns a constant indicating the disclosure state of the item.  Must be
    one of SC.BRANCH_OPEN, SC.BRANCH_CLOSED, SC.LEAF_NODE.  If you return one
    of the BRANCH options then the item may be rendered with a disclosure
    triangle open or closed.  If you return SC.LEAF_NODe then the item will
    be rendered as a leaf node.

    Default returns SC.LEAF_NODE.

    @param {SC.CollectionView} collection the collection view
    @param {SC.Array} content the content object
    @param {Number} idx the content index
    @returns {Boolean} YES, NO, or SC.MIXED_STATE
  */
  contentIndexDisclosureState: function(collection, content, idx) {
    return SC.LEAF_NODE;
  },

  /**
    Called to expand a content index item if it is currently in a closed
    disclosure state.  The default implementation does nothing.

    @param {SC.CollectionView} collection the collection view
    @param {SC.Array} content the content object
    @param {Number} idx the content index
    @returns {void}
  */
  contentIndexExpand: function(collection, content, idx) {
    SC.Logger.log('contentIndexExpand(%@, %@, %@)'.fmt(collection, content, idx));
  },

  /**
    Called to collapse a content index item if it is currently in an open
    disclosure state.  The default implementation does nothing.

    @param {SC.CollectionView} collection the collection view
    @param {SC.Array} content the content object
    @param {Number} idx the content index
    @returns {void}
  */
  contentIndexCollapse: function(collection, content, idx) {
    SC.Logger.log('contentIndexCollapse(%@, %@, %@)'.fmt(collection, content, idx));
  }

};

/* >>>>>>>>>> BEGIN source/private/tree_item_observer.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('mixins/tree_item_content');
sc_require('mixins/collection_content');

/**
  @ignore
  @class

  A TreeNode is an internal class that will manage a single item in a tree
  when trying to display the item in a hierarchy.

  When displaying a tree of objects, a tree item object will be nested to
  cover every object that might have child views.

  TreeNode stores an array which contains either a number pointing to the
  next place in the array there is a child item or it contains a child item.

  @extends SC.Object
  @extends SC.Array
  @extends SC.CollectionContent
  @since SproutCore 1.0
*/
SC.TreeItemObserver = SC.Object.extend(SC.Array, SC.CollectionContent, {

  /**
    The node in the tree this observer will manage.  Set when creating the
    object.  If you are creating an observer manually, you must set this to
    a non-null value.
  */
  item: null,

  /**
    The controller delegate.  If the item does not implement the
    TreeItemContent method, delegate properties will be used to determine how
    to access the content.  Set automatically when a tree item is created.

    If you are creating an observer manually, you must set this to a non-null
    value.
  */
  delegate: null,

  // ..........................................................
  // FOR NESTED OBSERVERS
  //

  /**
    The parent TreeItemObserver for this observer.  Must be set on create.
  */
  parentObserver: null,

  /**
    The parent item for the observer item.  Computed automatically from the
    parent.  If the value of this is null, then this is the root of the tree.
  */
  parentItem: function() {
    var p = this.get('parentObserver');
    return p ? p.get('item') : null;
  }.property('parentObserver').cacheable(),

  /**
    Index location in parent's children array.  If this is the root item
    in the tree, should be null.
  */
  index: null,

  outlineLevel: 0,

  // ..........................................................
  // EXTRACTED FROM ITEM
  //

  /**
    Array of child tree items.  Extracted from the item automatically on init.
  */
  children: null,

  /**
    Disclosure state of this item.  Must be SC.BRANCH_OPEN or SC.BRANCH_CLOSED
    If this is the root of a item tree, the observer will have children but
    no parent or parent item.  IN this case the disclosure state is always
    SC.BRANCH_OPEN.

    @property
    @type Number
  */
  disclosureState: SC.BRANCH_OPEN,

  /**
    IndexSet of children with branches.  This will ask the delegate to name
    these indexes.  The default implementation will iterate over the children
    of the item but a more optimized version could avoid touching each item.

    @property
    @type SC.IndexSet
  */
  branchIndexes: function() {
    var item = this.get('item'),
        len, pitem, idx, children, ret;

    // no item - no branches
    if (!item) return SC.IndexSet.EMPTY;

    // if item is treeItemContent then ask it directly
    else if (item.isTreeItemContent) {
      pitem  = this.get('parentItem');
      idx    = this.get('index') ;
      return item.treeItemBranchIndexes(pitem, idx);

    // otherwise, loop over children and determine disclosure state for each
    } else {
      children = this.get('children');
      if (!children) return null; // no children - no branches
      ret = SC.IndexSet.create();
      len = children.get('length');
      pitem = item ; // save parent

      for(idx=0;idx<len;idx++) {
        if (!(item = children.objectAt(idx))) continue ;
        if (!this._computeChildren(item, pitem, idx)) continue; // no children
        if (this._computeDisclosureState(item, pitem, idx) !== SC.LEAF_NODE) {
          ret.add(idx);
        }
      }

      return ret.get('length')>0 ? ret : null;
    }
  }.property('children').cacheable(),

  /**
    Returns YES if the item itself should be shown, NO if only its children
    should be shown.  Normally returns YES unless the parentObject is null.
  */
  isHeaderVisible: function() {
    return !!this.get('parentObserver');
  }.property('parentObserver').cacheable(),

  /**
    Get the current length of the tree item including any of its children.
  */
  length: 0,

  // ..........................................................
  // SC.ARRAY SUPPORT
  //

  /**
    Get the object at the specified index.  This will talk the tree info
    to determine the proper place.  The offset should be relative to the
    start of this tree item.  Calls recursively down the tree.

    This should only be called with an index you know is in the range of item
    or its children based on looking at the length.

    @param {Number} index
    @param {Boolean} omitMaterializing
    @returns {Object}
  */
  objectAt: function(index, omitMaterializing) {
    var len   = this.get('length'),
        item  = this.get('item'),
        cache = this._objectAtCache,
        cur   = index,
        loc   = 0,
        indexes, children;

    if (index >= len) return undefined;
    if (this.get('isHeaderVisible')) {
      if (index === 0) return item;
      else cur--;
    }
    item = null;

    if (!cache) cache = this._objectAtCache = [];
    if ((item = cache[index]) !== undefined) return item ;

    children = this.get('children');
    if (!children) return undefined; // no children - nothing to get

    // loop through branch indexes, reducing the offset until it matches
    // something we might actually return.
    if (indexes = this.get('branchIndexes')) {
      indexes.forEach(function(i) {
        if (item || (i > cur)) return ; // past end - nothing to do

        var observer = this.branchObserverAt(i), len;
        if (!observer) return ; // nothing to do

        // if cur lands inside of this observer's length, use objectAt to get
        // otherwise, just remove len from cur.
        len = observer.get('length') ;
        if (i+len > cur) {
          item = observer.objectAt(cur-i, omitMaterializing);
          cur  = -1;
        } else cur -= len-1 ;

      },this);
    }

    if (cur>=0) item = children.objectAt(cur, omitMaterializing); // get internal if needed
    cache[index] = item ; // save in cache

    return item ;
  },

  /**
    Implements SC.Array.replace() primitive.  For this method to succeed, the
    range you replace must lie entirely within the same parent item, otherwise
    this will raise an exception.

    ### The Operation Parameter

    Note that this replace method accepts an additional parameter "operation"
    which is used when you try to insert an item on a boundary between
    branches whether it should be inserted at the end of the previous group
    after the group.  If you don't pass operation, the default is
    SC.DROP_BEFORE, which is the expected behavior.

    Even if the operation is SC.DROP_AFTER, you should still pass the actual
    index where you expect the item to be inserted.  For example, if you want
    to insert AFTER the last index of an 3-item array, you would still call:

        observer.replace(3, 0, [object1 .. objectN], SC.DROP_AFTER)

    The operation is simply used to disambiguate whether the insertion is
    intended to be AFTER the previous item or BEFORE the items you are
    replacing.

    @param {Number} start the starting index
    @param {Number} amt the number of items to replace
    @param {SC.Array} objects array of objects to insert
    @param {Number} operation either SC.DROP_BEFORE or SC.DROP_AFTER
    @returns {SC.TreeItemObserver} receiver
  */
  replace: function(start, amt, objects, operation) {

    var cur      = start,
        observer = null,
        indexes, len, max;

    if (operation === undefined) operation = SC.DROP_BEFORE;

    // adjust the start location based on branches, possibly passing on to an
    // observer.
    if (this.get('isHeaderVisible')) cur--; // exclude my own header item
    if (cur < 0) throw new Error("Tree Item cannot replace itself");

    // remove branch lengths.  If the adjusted start location lands inside of
    // another branch, then just let that observer handle it.
    if (indexes = this.get('branchIndexes')) {
      indexes.forEach(function(i) {
        if (observer || (i>=cur)) return ; // nothing to do
        if (!(observer = this.branchObserverAt(i))) return; // nothing to do
        len = observer.get('length');

        // if this branch range is before the start loc, just remove it and
        // go on.  If cur is somewhere inside of the range, then save to pass
        // on.  Note use of operation to determine the ambiguous end op.
        if ((i+len === cur) && operation === SC.DROP_AFTER) cur -= i;
        else if (i+len > cur) cur -= i; // put inside of nested range
        else {
          cur -= len-1; observer = null ;
        }
      }, this);
    }

    // if an observer was saved, pass on call.
    if (observer) {
      observer.replace(cur, amt, objects, operation);
      return this;
    }

    // no observer was saved, which means cur points to an index inside of
    // our own range.  Now amt just needs to be adjusted to remove any
    // visible branches as well.
    max = cur + amt;
    if (amt>1 && indexes) { // if amt is 1 no need...
      indexes.forEachIn(cur, indexes.get('max')-cur, function(i) {
        if (i > max) return; // nothing to do
        if (!(observer = this.branchObserverAt(i))) return; // nothing to do
        len = observer.get('length');
        max -= len-1;
      }, this);
    }

    // get amt back out.  if amt is negative, it means that the range passed
    // was not cleanly inside of this range.  raise an exception.
    amt = max-cur;

    // ok, now that we are adjusted, get the children and forward the replace
    // call on.  if there are no children, bad news...
    var children = this.get('children');
    if (!children) throw new Error("cannot replace() tree item with no children");

    if ((amt < 0) || (max>children.get('length'))) {
      throw new Error("replace() range must lie within a single tree item");
    }

    children.replace(cur, amt, objects, operation);

    // don't call enumerableContentDidChange() here because, as an observer,
    // we should be notified by the children array itself.

    return this;
  },

  /**
    Called whenever the content for the passed observer has changed.  Default
    version notifies the parent if it exists and updates the length.

    The start, amt and delta params should reflect changes to the children
    array, not to the expanded range for the wrapper.
  */
  observerContentDidChange: function(start, amt, delta) {

    // clear caches
    this.invalidateBranchObserversAt(start);
    this._objectAtCache = this._outlineLevelCache = null;
    this._disclosureStateCache = null;
    this._contentGroupIndexes = NO;
    this.notifyPropertyChange('branchIndexes');

    var oldlen = this.get('length'),
        newlen = this._computeLength(),
        parent = this.get('parentObserver'), set;

    // update length if needed
    if (oldlen !== newlen) this.set('length', newlen);

    // if we have a parent, notify that parent that we have changed.
    if (!this._notifyParent) return this; // nothing more to do

    if (parent) {
      set = SC.IndexSet.create(this.get('index'));
      parent._childrenRangeDidChange(parent.get('children'), null, '[]', set);

    // otherwise, note the enumerable content has changed.  note that we need
    // to convert the passed change to reflect the computed range
    } else {
      if (oldlen === newlen) {
        amt = this.expandChildIndex(start+amt);
        start = this.expandChildIndex(start);
        amt = amt - start ;
        delta = 0 ;

      } else {
        start = this.expandChildIndex(start);
        amt   = newlen - start;
        delta = newlen - oldlen ;
      }

      var removedCount = amt;
      var addedCount = delta + removedCount;
      this.arrayContentDidChange(start, removedCount, addedCount);
    }
  },

  /**
    Accepts a child index and expands it to reflect any nested groups.
  */
  expandChildIndex: function(index) {

    var ret = index;
    if (this.get('isHeaderVisible')) index++;

    // fast path
    var branches = this.get('branchIndexes');
    if (!branches || branches.get('length')===0) return ret;

    // we have branches, adjust for their length
    branches.forEachIn(0, index, function(idx) {
      ret += this.branchObserverAt(idx).get('length')-1;
    }, this);

    return ret; // add 1 for item header
  },

  // ..........................................................
  // SC.COLLECTION CONTENT SUPPORT
  //

  _contentGroupIndexes: NO,

  /**
    Called by the collection view to return any group indexes.  The default
    implementation will compute the indexes one time based on the delegate
    treeItemIsGrouped
  */
  contentGroupIndexes: function(view, content) {
    if (content !== this) return null; // only care about receiver

    var ret = this._contentGroupIndexes;
    if (ret !== NO) return ret ;

    // If this is not the root item, never do grouping
    if (this.get('parentObserver')) return null;

    var item = this.get('item'), group, indexes, cur, padding;

    if (item && item.isTreeItemContent) group = item.get('treeItemIsGrouped');
    else group = !!this.delegate.get('treeItemIsGrouped');

    // If grouping is enabled, build an index set with all of our local groups.
    if (group) {
      ret      = SC.IndexSet.create();
      indexes  = this.get('branchIndexes');

      if (indexes) {
        // Start at the minimum index, which is equal for the tree and flat array
        cur = indexes.min();

        // Padding is the difference between the tree index and array index for the current tree index
        padding = 0;
        indexes.forEach(function(i) {
          ret.add(i + padding, 1);

            var observer = this.branchObserverAt(i);
            if (observer) {
              padding += observer.get('length') - 1;
              cur += padding;
            }
          }, this);
      }
    } else {
      ret = null;
    }

    this._contentGroupIndexes = ret ;
    return ret;
  },

  contentIndexIsGroup: function(view, content, idx) {
    var indexes = this.contentGroupIndexes(view, content);
    return indexes ? indexes.contains(idx) : NO ;
  },

  /**
    Returns the outline level for the specified index.
  */
  contentIndexOutlineLevel: function(view, content, index) {
    if (content !== this) return -1; // only care about us

    var cache = this._outlineLevelCache;
    if (cache && (cache[index] !== undefined)) return cache[index];
    if (!cache) cache = this._outlineLevelCache = [];

    var len   = this.get('length'),
        cur   = index,
        loc   = 0,
        ret   = null,
        indexes, children, observer;

    if (index >= len) return -1;

    if (this.get('isHeaderVisible')) {
      if (index === 0) return cache[0] = this.get('outlineLevel')-1;
      else cur--;
    }

    // loop through branch indexes, reducing the offset until it matches
    // something we might actually return.
    if (indexes = this.get('branchIndexes')) {
      indexes.forEach(function(i) {
        if ((ret!==null) || (i > cur)) return ; // past end - nothing to do

        var observer = this.branchObserverAt(i), len;
        if (!observer) return ; // nothing to do

        // if cur lands inside of this observer's length, use objectAt to get
        // otherwise, just remove len from cur.
        len = observer.get('length') ;
        if (i+len > cur) {
          ret  = observer.contentIndexOutlineLevel(view, observer, cur-i);
          cur  = -1;
        } else cur -= len-1 ;

      },this);
    }

    if (cur>=0) ret = this.get('outlineLevel'); // get internal if needed
    cache[index] = ret ; // save in cache
    return ret ;
  },

  /**
    Returns the disclosure state for the specified index.
  */
  contentIndexDisclosureState: function(view, content, index) {
    if (content !== this) return -1; // only care about us

    var cache = this._disclosureStateCache;
    if (cache && (cache[index] !== undefined)) return cache[index];
    if (!cache) cache = this._disclosureStateCache = [];

    var len   = this.get('length'),
        cur   = index,
        loc   = 0,
        ret   = null,
        indexes, children, observer;

    if (index >= len) return SC.LEAF_NODE;

    if (this.get('isHeaderVisible')) {
      if (index === 0) return cache[0] = this.get('disclosureState');
      else cur--;
    }

    // loop through branch indexes, reducing the offset until it matches
    // something we might actually return.
    if (indexes = this.get('branchIndexes')) {
      indexes.forEach(function(i) {
        if ((ret!==null) || (i > cur)) return ; // past end - nothing to do

        var observer = this.branchObserverAt(i), len;
        if (!observer) return ; // nothing to do

        // if cur lands inside of this observer's length, use objectAt to get
        // otherwise, just remove len from cur.
        len = observer.get('length') ;
        if (i+len > cur) {
          ret  = observer.contentIndexDisclosureState(view, observer, cur-i);
          cur  = -1;
        } else cur -= len-1 ;

      },this);
    }

    if (cur>=0) ret = SC.LEAF_NODE; // otherwise its a leaf node
    cache[index] = ret ; // save in cache
    return ret ;
  },

  /**
    Expands the specified content index.  This will search down until it finds
    the branchObserver responsible for this item and then calls _collapse on
    it.
  */
  contentIndexExpand: function(view, content, idx) {

    var indexes, cur = idx, children, item;

    if (content !== this) return; // only care about us
    if (this.get('isHeaderVisible')) {
      if (idx===0) {
        this._expand(this.get('item'));
        return;
      } else cur--;
    }

    if (indexes = this.get('branchIndexes')) {
      indexes.forEach(function(i) {
        if (i >= cur) return; // past end - nothing to do
        var observer = this.branchObserverAt(i), len;
        if (!observer) return ;

        len = observer.get('length');
        if (i+len > cur) {
          observer.contentIndexExpand(view, observer, cur-i);
          cur = -1 ; //done
        } else cur -= len-1;

      }, this);
    }

    // if we are still inside of the range then maybe pass on to a child item
    if (cur>=0) {
      children = this.get('children');
      item     = children ? children.objectAt(cur) : null;
      if (item) this._expand(item, this.get('item'), cur);
    }
  },

  /**
    Called to collapse a content index item if it is currently in an open
    disclosure state.  The default implementation does nothing.

    @param {SC.CollectionView} view the collection view
    @param {SC.Array} content the content object
    @param {Number} idx the content index
    @returns {void}
  */
  contentIndexCollapse: function(view, content, idx) {

    var indexes, children, item, cur = idx;

    if (content !== this) return; // only care about us
    if (this.get('isHeaderVisible')) {
      if (idx===0) {
        this._collapse(this.get('item'));
        return;
      } else cur--;
    }


    if (indexes = this.get('branchIndexes')) {
      indexes.forEach(function(i) {
        if (i >= cur) return; // past end - nothing to do
        var observer = this.branchObserverAt(i), len;
        if (!observer) return ;

        len = observer.get('length');
        if (i+len > cur) {
          observer.contentIndexCollapse(view, observer, cur-i);
          cur = -1 ; //done
        } else cur -= len-1;

      }, this);
    }

    // if we are still inside of the range then maybe pass on to a child item
    if (cur>=0) {
      children = this.get('children');
      item     = children ? children.objectAt(cur) : null;
      if (item) this._collapse(item, this.get('item'), cur);
    }
  },

  // ..........................................................
  // BRANCH NODES
  //

  /**
    Returns the branch item for the specified index.  If none exists yet, it
    will be created.
  */
  branchObserverAt: function(index) {
    var byIndex = this._branchObserversByIndex,
        indexes = this._branchObserverIndexes,
        ret, parent, pitem, item, children, guid, del ;

    if (!byIndex) byIndex = this._branchObserversByIndex = [];
    if (!indexes) {
      indexes = this._branchObserverIndexes = SC.IndexSet.create();
    }

    if (ret = byIndex[index]) return ret ; // use cache

    // no observer for this content exists, create one
    children = this.get('children');
    item   = children ? children.objectAt(index) : null ;
    if (!item) return null ; // can't create an observer for a null item

    byIndex[index] = ret = SC.TreeItemObserver.create({
      item:     item,
      delegate: this.get('delegate'),
      parentObserver:   this,
      index:  index,
      outlineLevel: this.get('outlineLevel')+1
    });

    indexes.add(index); // save for later invalidation
    return ret ;
  },

  /**
    Invalidates any branch observers on or after the specified index range.
  */
  invalidateBranchObserversAt: function(index) {
    var byIndex = this._branchObserversByIndex,
        indexes = this._branchObserverIndexes;

    if (!byIndex || byIndex.length<=index) return this ; // nothing to do
    if (index < 0) index = 0 ;

    // destroy any observer on or after the range
    indexes.forEachIn(index, indexes.get('max')-index, function(i) {
      var observer = byIndex[i];
      if (observer) observer.destroy();
    }, this);

    byIndex.length = index; // truncate to dump extra indexes

    return this;
  },

  // ..........................................................
  // INTERNAL METHODS
  //

  init: function() {
    arguments.callee.base.apply(this,arguments);

    // begin all properties on item if there is one.  This will allow us to
    // track important property changes.
    var item = this.get('item');
    if (!item) throw new Error("SC.TreeItemObserver.item cannot be null");

    item.addObserver('*', this, this._itemPropertyDidChange);
    this._itemPropertyDidChange(item, '*');
    this._notifyParent = YES ; // avoid infinite loops
  },

  /**
    Called just before a branch observer is removed.  Should stop any
    observing and invalidate any child observers.
  */
  destroy: function() {
    this.invalidateBranchObserversAt(0);
    this._objectAtCache = null ;
    this._notifyParent = NO ; // parent doesn't care anymore

    // cleanup observing
    var item = this.get('item');
    if (item) item.removeObserver('*', this, this._itemPropertyDidChange);

    var children = this._children,
        ro = this._childrenRangeObserver;
    if (children && ro) children.removeRangeObserver(ro);

    this.set('length', 0);

    arguments.callee.base.apply(this,arguments);
  },

  /**
    Called whenever a property changes on the item.  Determines if either the
    children array or the disclosure state has changed and then notifies as
    necessary..
  */
  _itemPropertyDidChange: function(target, key) {
    var children = this.get('children'),
        state    = this.get('disclosureState'),
        item     = this.get('item'),
        next ;

    this.beginPropertyChanges();

    next = this._computeDisclosureState(item);
    if (state !== next) this.set('disclosureState', next);

    next = this._computeChildren(item);
    if (children !== next) this.set('children', next);

    this.endPropertyChanges();
  },

  /**
    Called whenever the children or disclosure state changes.  Begins or ends
    observing on the children array so that changes can propogate outward.
  */
  _childrenDidChange: function() {
    var state = this.get('disclosureState'),
        cur   = state === SC.BRANCH_OPEN ? this.get('children') : null,
        last  = this._children,
        ro    = this._childrenRangeObserver;

    if (last === cur) return this; //nothing to do
    if (ro) last.removeRangeObserver(ro);
    if (cur) {
      this._childrenRangeObserver =
          cur.addRangeObserver(null, this, this._childrenRangeDidChange);
    } else this._childrenRangeObserver = null;

    this._children = cur ;
    this._childrenRangeDidChange(cur, null, '[]', null);

  }.observes("children", "disclosureState"),

  /**
    Called anytime the actual content of the children has changed.  If this
    changes the length property, then notifies the parent that the content
    might have changed.
  */
  _childrenRangeDidChange: function(array, objects, key, indexes) {
    var children = this.get('children'),
        len = children ? children.get('length') : 0,
        min = indexes ? indexes.get('min') : 0,
        max = indexes ? indexes.get('max') : len,
        old = this._childrenLen || 0;

    this._childrenLen = len; // save for future calls
    this.observerContentDidChange(min, max-min, len-old);
  },

  /**
    Computes the current disclosure state of the item by asking the item or
    the delegate.  If no pitem or index is passed, the parentItem and index
    will be used.
  */
  _computeDisclosureState: function(item, pitem, index) {
    var key, del;

    // no item - assume leaf node
    if (!item || !this._computeChildren(item)) return SC.LEAF_NODE;

    // item implement TreeItemContent - call directly
    else if (item.isTreeItemContent) {
      if (pitem === undefined) pitem = this.get('parentItem');
      if (index === undefined) index = this.get('index');
      return item.treeItemDisclosureState(pitem, index);

    // otherwise get treeItemDisclosureStateKey from delegate
    } else {
      key = this._treeItemIsExpandedKey ;
      if (!key) {
        del = this.get('delegate');
        key = del ? del.get('treeItemIsExpandedKey') : 'treeItemIsExpanded';
        this._treeItemIsExpandedKey = key ;
      }
      return item.get(key) ? SC.BRANCH_OPEN : SC.BRANCH_CLOSED;
    }
  },

  /**
    Collapse the item at the specified index.  This will either directly
    modify the property on the item or call the treeItemCollapse() method.
  */
  _collapse: function(item, pitem, index) {
    var key, del;

    // no item - assume leaf node
    if (!item || !this._computeChildren(item)) return this;

    // item implement TreeItemContent - call directly
    else if (item.isTreeItemContent) {
      if (pitem === undefined) pitem = this.get('parentItem');
      if (index === undefined) index = this.get('index');
      item.treeItemCollapse(pitem, index);

    // otherwise get treeItemDisclosureStateKey from delegate
    } else {
      key = this._treeItemIsExpandedKey ;
      if (!key) {
        del = this.get('delegate');
        key = del ? del.get('treeItemIsExpandedKey') : 'treeItemIsExpanded';
        this._treeItemIsExpandedKey = key ;
      }
      item.setIfChanged(key, NO);
    }

    return this ;
  },

  /**
    Expand the item at the specified index.  This will either directly
    modify the property on the item or call the treeItemExpand() method.
  */
  _expand: function(item, pitem, index) {
    var key, del;

    // no item - assume leaf node
    if (!item || !this._computeChildren(item)) return this;

    // item implement TreeItemContent - call directly
    else if (item.isTreeItemContent) {
      if (pitem === undefined) pitem = this.get('parentItem');
      if (index === undefined) index = this.get('index');
      item.treeItemExpand(pitem, index);

    // otherwise get treeItemDisclosureStateKey from delegate
    } else {
      key = this._treeItemIsExpandedKey ;
      if (!key) {
        del = this.get('delegate');
        key = del ? del.get('treeItemIsExpandedKey') : 'treeItemIsExpanded';
        this._treeItemIsExpandedKey = key ;
      }
      item.setIfChanged(key, YES);
    }

    return this ;
  },

  /**
    Computes the children for the passed item.
  */
  _computeChildren: function(item) {
    var del, key;

    // no item - no children
    if (!item) return null;

    // item implement TreeItemContent - call directly
    else if (item.isTreeItemContent) return item.get('treeItemChildren');

    // otherwise get treeItemChildrenKey from delegate
    else {
      key = this._treeItemChildrenKey ;
      if (!key) {
        del = this.get('delegate');
        key = del ? del.get('treeItemChildrenKey') : 'treeItemChildren';
        this._treeItemChildrenKey = key ;
      }
      return item.get(key);
    }
  },

  /**
    Computes the length of the array by looking at children.
  */
  _computeLength: function() {
    var ret = this.get('isHeaderVisible') ? 1 : 0,
        state = this.get('disclosureState'),
        children = this.get('children'),
        indexes ;

    // if disclosure is open, add children count + length of branch observers.
    if ((state === SC.BRANCH_OPEN) && children) {
      ret += children.get('length');
      if (indexes = this.get('branchIndexes')) {
        indexes.forEach(function(idx) {
          var observer = this.branchObserverAt(idx);
          ret += observer.get('length')-1;
        }, this);
      }
    }
    return ret ;
  }

});


/* >>>>>>>>>> BEGIN source/controllers/tree.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('private/tree_item_observer');

/*
  TODO Document more
*/

/**
  @class

  A TreeController manages a tree of model objects that you might want to
  display in the UI using a collection view.  For the most part, you should
  work with a TreeController much like you would an ObjectController, except
  that the TreeController will also provide an arrangedObjects property that
  can be used as the content of a CollectionView.

  @extends SC.ObjectController
  @extends SC.SelectionSupport
  @since SproutCore 1.0
*/
SC.TreeController = SC.ObjectController.extend(SC.SelectionSupport,
/** @scope SC.TreeController.prototype */ {

  // ..........................................................
  // PROPERTIES
  //

  /**
    Set to YES if you want the top-level items in the tree to be displayed as
    group items in the collection view.

    @type Boolean
    @default NO
  */
  treeItemIsGrouped: NO,

  /**
    If your content support expanding and collapsing of content, then set this
    property to the name of the key on your model that should be used to
    determine the expansion state of the item.  The default is
    "treeItemIsExpanded"

    @type String
    @default "treeItemIsExpanded"
  */
  treeItemIsExpandedKey: "treeItemIsExpanded",

  /**
    Set to the name of the property on your content object that holds the
    children array for each tree node.  The default is "treeItemChildren".

    @type String
    @default "treeItemChildren"
  */
  treeItemChildrenKey: "treeItemChildren",

  /**
    Returns an SC.Array object that actually will represent the tree as a
    flat array suitable for use by a CollectionView.  Other than binding this
    property as the content of a CollectionView, you generally should not
    use this property directly.  Instead, work on the tree content using the
    TreeController like you would any other ObjectController.

    @type SC.Array
  */
  arrangedObjects: function () {
    var content = this.get('content'),
      ret;

    if (content) {
      ret = SC.TreeItemObserver.create({ item: content, delegate: this });
      ret.bind('allowsSelection', this, 'allowsSelection');
      ret.bind('allowsMultipleSelection', this, 'allowsMultipleSelection');
      ret.bind('allowsEmptySelection', this, 'allowsEmptySelection');

      ret.addObserver('[]', this, this._sctc_arrangedObjectsContentDidChange);
    } else {
      ret = null; // empty!
    }

    // Cache the current tree item observer, so we have it when it changes.
    this._sctc_arrangedObjects = ret;

    return ret;
  }.property().cacheable(),

  // ..........................................................
  // PRIVATE
  //

  /**
    @private

    Manually invalidate the arrangedObjects cache so that we can teardown
    any existing value.  We do it via an observer so that this will fire
    immediately instead of waiting on some other component to get
    arrangedObjects again.
  */
  _sctc_invalidateArrangedObjects: function () {
    this.propertyWillChange('arrangedObjects');

    // Clean up!  Destroy the previous tree item observer.
    var ret = this._sctc_arrangedObjects;
    if (ret) { ret.destroy(); }
    this._sctc_arrangedObjects = null;

    this.propertyDidChange('arrangedObjects');

    // Fix up the selection with the new arrangedObjects.
    this.updateSelectionAfterContentChange();
  }.observes('content', 'treeItemIsExpandedKey', 'treeItemChildrenKey', 'treeItemIsGrouped'),

  _sctc_arrangedObjectsContentDidChange: function () {
    this.updateSelectionAfterContentChange();
  },

  canSelectGroups: NO,

  /**
    @private

    Returns the first item in arrangedObjects that is not a group.  This uses
    a brute force approach right now; we assume you probably don't have a lot
    of groups up front.
  */
  firstSelectableObject: function () {
    var objects = this.get('arrangedObjects'),
        indexes, len, idx     = 0;

    if (!objects) return null; // fast track

    // other fast track. if you want something fancier use collectionViewDelegate
    if (this.get('canSelectGroups')) return objects.get('firstObject');

    indexes = objects.contentGroupIndexes(null, objects);
    len = objects.get('length');
    while (indexes.contains(idx) && (idx < len)) idx++;
    return idx >= len ? null : objects.objectAt(idx);
  }.property()

});


/* >>>>>>>>>> BEGIN source/debug/control_test_pane.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*global test Q$ */

// TODO: IMPROVE CODE QUALITY.  This code was put together quickly in order to
// test the SproutCore framework.  It does not match up to the project's
// normal documentation, design and coding standards.  Do not rely on this
// code as an example of how to build your own applications.

/** @class
  Generates a pane that will display vertically stacked views for testing.
  You can use this class in test mode to easily create a palette with views
  configured in different ways.

  # Example

      var pane = SC.ControlTestPane.design()
        .add('basic', SC.CheckboxView.design({ title: "Hello World" }))
        .add('disabled', SC.CheckboxView.design({
          title: "Hello World", isEnabled: NO
        }));

      module("CheckboxView UI", pane);

      test("basic", function() {
        var view = pane.view('basic');
        ok(view.get('isEnabled'), 'should be enabled');
      });

  @extends SC.Pane
  @since SproutCore 1.0
*/
SC.ControlTestPane = SC.Pane.extend(
/** @scope SC.ControlTestPane.prototype */ {

  classNames: ['sc-control-test-pane'],
  layout: { right: 20, width: 350, top: 65, bottom: 5 },

  /**
    The starting top location for the first row.  This will increment as
    views are added to the pane.

    @type Number
    @default 0
  */
  top: 0,

  /**
    The default height of each row.  This will be used for a view unless you
    manually specify a height in the view's layout.

    @type Number
    @default 20
  */
  height: 20,

  /**
    The default padding added to the edges and between each row.

    @type Number
    @default 4
  */
  padding: 4,

  /**
    Retrieves the test sample view that was added with the passed key name.

    @param {String} keyName the key used to register the view.
    @returns {SC.View} view instance
  */
  view: function(keyName) {
    var idx = this._views[keyName];
    if (!idx) throw new Error("SC.ControlTestPane does not have a view named %@".fmt(keyName));
    return this.childViews[idx].childViews[0];
  },

  /** @private */
  init: function() {
    arguments.callee.base.apply(this,arguments);
    if (!this._views) this._views = {};
    this.append(); // auto-add to screen

    // Also adjust unit test results to make space
    // use setTimeout to avoid screwing with the RunLoop which we might be
    // testing.
    var l = this.get('layout'), w = l.right + l.width;
    setTimeout(function() {
      if (!Q$) return ; // nothing to do
      Q$('.core-test > .detail').css('marginRight', w);
    }, 100);
  }
});

/**
  Adds a test view to the control pane design.  The passed label will be used
  as the key which you can use to find the view layer.  You can either pass
  a view that is already designed or pass an array of attributes that will be
  used to create a design on the view.

  @param {String} label the view key name
  @param {SC.View} view a view class or view design
  @param {Hash} attrs optional attrs to use when designing the view
  @returns {SC.ControlTestPane} receiver
*/
SC.ControlTestPane.add = function(label, view, attrs) {
  if (attrs === undefined) attrs = {};
  if (!view.isDesign) view = view.design(attrs);

  // compute layout.
  var padding = this.prototype.padding, height = this.prototype.height;
  var top = this.prototype.top + padding*2, layout;
  var labelHeight =14;
  if (top === padding*2) top = padding; // reduce padding @ top

  // if the passed in view has a layout property and the layout has an
  // explicit, numerical height, then use that instead.
  if (view.prototype.layout && (typeof view.prototype.layout.height === SC.T_NUMBER)) height = view.prototype.layout.height;

  this.prototype.top = top + height+labelHeight+(padding*2); // make room

  // calculate labelView and add it
  layout = { left: padding, width: 150, top: top, height: 20 };
  var labelView = SC.LabelView.design({
    value: label + ':',
    layout: { left: 0, right: 0, top: 0, height: labelHeight },
   // TODO: textAlign: SC.ALIGN_RIGHT,
    // TODO: fontWeight: SC.BOLD_WEIGHT
  });

  // wrap label in parent view in order to center text vertically
  labelView = SC.View.design().layout(layout).childView(labelView);
  this.childView(labelView);

  // now layout view itself...
  var wrapper = SC.View.design({
    classNames: ['wrapper'],
    layout: { left: padding, top: top+labelHeight+padding, right: padding, height: height },
    childViews: [view]
  });
  var idx = this.prototype.childViews.length ;
  this.childView(wrapper);

  var views = this.prototype._views;
  if (!views) views = this.prototype._views = {};
  views[label] = idx ;

  return this;
};

/**
  Returns a standard setup/teardown object for use by the module() method.
*/
SC.ControlTestPane.standardSetup = function() {
  var pane = this ;
  return {
    setup: function() {
      SC.RunLoop.begin();
      pane._pane = pane.create();
      SC.RunLoop.end();
    },

    teardown: function() {
      SC.RunLoop.begin();
      if (pane._pane) pane._pane.destroy();
      SC.RunLoop.end();

      pane._pane = null ;
    }
  } ;
};

/**
  Convenience method.  Returns the view with the given name on the current
  pane instance if there is one.

  @param {String} keyName the key used to register the view.
  @returns {SC.View} view instance
*/
SC.ControlTestPane.view = function(viewKey) {
  var pane = this._pane || this._showPane ;
  if (!pane) throw new Error("view() cannot be called on a class");
  return pane.view(viewKey);
};

/**
  Registers a final test that will instantiate the control test pane and
  display it.  This allows the developer to interact with the controls once
  the test has completed.
*/
SC.ControlTestPane.show = function() {
  var pane = this ;
  test("show control test pane", function() {
    SC.RunLoop.begin();
    pane._showPane = pane.create();
    SC.RunLoop.end();
  });
};

/* >>>>>>>>>> BEGIN source/delegates/inline_text_field.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/**
  @namespace

  This is the default InlineEditorDelegate for SC.LabelView. The default editor
  is an SC.InlineTextFieldView.

  Only one editor is allowed to be active at a time. If another view requests an
  editor while an editor is already active, the delegate will first attempt to
  commit the existing editor, then discard it if commit fails, and fail to
  acquire if the active editor could not be discarded.

  Each time an editor is required, it instantiates it and appends it to the same
  parentView as the view being edited. The editor is responsible for positioning
  itself correctly in its beginEditing method.

  @since SproutCore 1.0
*/
SC.InlineTextFieldDelegate = /** @scope SC.InlineTextFieldDelegate */{

  /**
    The current shared inline editor.

    @type SC.InlineTextFieldView
  */
  editor: null,

  /**
    If an editor is currently active, dismisses it by first attempting to commit
    and if that fails attempting to dismiss. If that fails, the acquire fails
    and returns null.

    Otherwise, it creates the editor as a child of the client view's parentView
    and returns it.

    The default editor is an SC.InlineTextFieldView. The client view may
    customize this by setting a different inlineEditor as its exampleEditor
    property.

    @param {SC.InlineEditable} label the label that is requesting an editor
    @returns {SC.InlineEditor} the editor the label should use to edit
  */
  acquireEditor: function (label) {
    var editor = this.editor;

    if (editor) {
      // attempt to end editing on the previous editor and return null if unable
      // to end editing successfully
      if (editor.get('isEditing') && !editor.commitEditing() && !editor.discardEditing()) return null;

      // now release it
      this.releaseEditor(editor);
    }

    // default to SC.InlineTextFieldView
    var exampleEditor = label.exampleEditor ? label.exampleEditor : SC.InlineTextFieldView,
    parentView = label.get('parentView');

    // set ourself as the delegate for the editor
    editor = this.editor = parentView.createChildView(exampleEditor, {
      inlineEditorDelegate: this
    });

    parentView.appendChild(editor);

    return editor;
  },

  /**
    Cleans up the given editor by simply destroying it, which removes it from
    the view hierarchy. The client view should null any references to the editor
    so it may be garbage collected.

    @params {SC.InlineEditor} editor the editor that should be cleaned up
    @returns {Boolean} whether the cleanup succeeded
  */
  releaseEditor: function (editor) {
    editor.destroy();

    this.editor = null;

    return YES;
  }
};


/* >>>>>>>>>> BEGIN source/system/string.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


/** @private */
SC.STRING_TITLEIZE_REGEXP = (/([\s|\-|\_|\n])([^\s|\-|\_|\n]?)/g);
SC.STRING_HUMANIZE_REGEXP = (/[\-_]/g);
SC.STRING_REGEXP_ESCAPED_REGEXP = (/([\\\.\+\*\?\[\^\]\$\(\)\{\}\=\!\<\>\|\:])/g);

/** @private
  Since there are many strings that are commonly dasherized(), we'll maintain
  // a cache.  Moreover, we'll pre-add some common ones.
*/
SC.STRING_DASHERIZE_CACHE = {
  top:      'top',
  left:     'left',
  right:    'right',
  bottom:   'bottom',
  width:    'width',
  height:   'height',
  minWidth: 'min-width',
  maxWidth: 'max-width'
};

/** @private
  Active Support style inflection constants
*/
SC.INFLECTION_CONSTANTS = {
  /** @private */
  PLURAL: [
      [/(quiz)$/i,               "$1zes"  ],
      [/^(ox)$/i,                "$1en"   ],
      [/([m|l])ouse$/i,          "$1ice"  ],
      [/(matr|vert|ind)ix|ex$/i, "$1ices" ],
      [/(x|ch|ss|sh)$/i,         "$1es"   ],
      [/([^aeiouy]|qu)y$/i,      "$1ies"  ],
      [/(hive)$/i,               "$1s"    ],
      [/(?:([^f])fe|([lr])f)$/i, "$1$2ves"],
      [/sis$/i,                  "ses"    ],
      [/([ti])um$/i,             "$1a"    ],
      [/(buffal|tomat)o$/i,      "$1oes"  ],
      [/(bu)s$/i,                "$1ses"  ],
      [/(alias|status)$/i,       "$1es"   ],
      [/(octop|vir)us$/i,        "$1i"    ],
      [/(ax|test)is$/i,          "$1es"   ],
      [/s$/i,                    "s"      ],
      [/$/,                      "s"      ]
  ],

  /** @private */
  SINGULAR: [
      [/(quiz)zes$/i,                                                    "$1"     ],
      [/(matr)ices$/i,                                                   "$1ix"   ],
      [/(vert|ind)ices$/i,                                               "$1ex"   ],
      [/^(ox)en/i,                                                       "$1"     ],
      [/(alias|status)es$/i,                                             "$1"     ],
      [/(octop|vir)i$/i,                                                 "$1us"   ],
      [/(cris|ax|test)es$/i,                                             "$1is"   ],
      [/(shoe)s$/i,                                                      "$1"     ],
      [/(o)es$/i,                                                        "$1"     ],
      [/(bus)es$/i,                                                      "$1"     ],
      [/([m|l])ice$/i,                                                   "$1ouse" ],
      [/(x|ch|ss|sh)es$/i,                                               "$1"     ],
      [/(m)ovies$/i,                                                     "$1ovie" ],
      [/(s)eries$/i,                                                     "$1eries"],
      [/([^aeiouy]|qu)ies$/i,                                            "$1y"    ],
      [/([lr])ves$/i,                                                    "$1f"    ],
      [/(tive)s$/i,                                                      "$1"     ],
      [/(hive)s$/i,                                                      "$1"     ],
      [/([^f])ves$/i,                                                    "$1fe"   ],
      [/(^analy)ses$/i,                                                  "$1sis"  ],
      [/((a)naly|(b)a|(d)iagno|(p)arenthe|(p)rogno|(s)ynop|(t)he)ses$/i, "$1$2sis"],
      [/([ti])a$/i,                                                      "$1um"   ],
      [/(n)ews$/i,                                                       "$1ews"  ],
      [/s$/i,                                                            ""       ]
  ],

  /** @private */
  IRREGULAR: [
      ['move',   'moves'   ],
      ['sex',    'sexes'   ],
      ['child',  'children'],
      ['man',    'men'     ],
      ['person', 'people'  ]
  ],

  /** @private */
  UNCOUNTABLE: [
      "sheep",
      "fish",
      "series",
      "species",
      "money",
      "rice",
      "information",
      "info",
      "equipment"
  ]
};

/**
  @namespace
  @lends SC.String
*/
SC.mixin(SC.String, {

  /**
    Capitalizes every word in a string.  Unlike titleize, spaces or dashes
    will remain in-tact.

    ## Examples

      - **Input String** -> **Output String**
      - my favorite items -> My Favorite Items
      - css-class-name -> Css-Class-Name
      - action_name -> Action_Name
      - innerHTML -> InnerHTML

    @param {String} str String to capitalize each letter2
    @returns {String} capitalized string
  */
  capitalizeEach: function(str) {
    return str.replace(SC.STRING_TITLEIZE_REGEXP,
      function(subStr, sep, character) {
        return (character) ? (sep + character.toUpperCase()) : sep;
      }).capitalize();
  },

  /**
    Converts a string to a title.  This will decamelize the string, convert
    separators to spaces and capitalize every word.

    ## Examples

      - **Input String** -> **Output String**
      - my favorite items -> My Favorite Items
      - css-class-name -> Css Class Name
      - action_name -> Action Name
      - innerHTML -> Inner HTML

    @param {String} str String to titleize
    @return {String} titleized string.
  */
  titleize: function(str) {
    var ret = str.replace(SC.STRING_DECAMELIZE_REGEXP,'$1_$2'); // decamelize
    return ret.replace(SC.STRING_TITLEIZE_REGEXP,
      function(subStr, separater, character) {
        return character ? ' ' + character.toUpperCase() : ' ';
      }).capitalize();
  },

  /**
    Converts the string into a class name.  This method will camelize your
    string and then capitalize the first letter.

    ## Examples

      - **Input String** -> **Output String**
      - my favorite items -> MyFavoriteItems
      - css-class-name -> CssClassName
      - action_name -> ActionName
      - innerHTML -> InnerHtml

    @param {String} str String to classify
    @returns {String}
  */
  classify: function(str) {
    var ret = str.replace(SC.STRING_TITLEIZE_REGEXP,
      function(subStr, separater, character) {
        return character ? character.toUpperCase() : '';
      });
    var first = ret.charAt(0), upper = first.toUpperCase();
    return first !== upper ? upper + ret.slice(1) : ret;
  },

  /**
    Converts a camelized string or a string with dashes or underscores into
    a string with components separated by spaces.

    ## Examples

      - **Input String** -> **Output String**
      - my favorite items -> my favorite items
      - css-class-name -> css class name
      - action_name -> action name
      - innerHTML -> inner html

    @param {String} str String to humanize
    @returns {String} the humanized string.
  */
  humanize: function(str) {
    return SC.String.decamelize(str).replace(SC.STRING_HUMANIZE_REGEXP,' ');
  },

  /**
    Will escape a string so it can be securely used in a regular expression.

    Useful when you need to use user input in a regular expression without
    having to worry about it breaking code if any reserved regular expression
    characters are used.

    @param {String} str String to escape for regex
    @returns {String} the string properly escaped for use in a regexp.
  */
  escapeForRegExp: function(str) {
    return str.replace(SC.STRING_REGEXP_ESCAPED_REGEXP, "\\$1");
  },

  /**
    Removes any standard diacritic characters from the string. So, for
    example, all instances of 'Á' will become 'A'.

    @param {String} str String to remove diacritics from
    @returns {String} the modified string
  */
  removeDiacritics: function(str) {
    // Lazily create the SC.diacriticMappingTable object.
    var diacriticMappingTable = SC.diacriticMappingTable;
    if (!diacriticMappingTable) {
      SC.diacriticMappingTable = {
       'À':'A', 'Á':'A', 'Â':'A', 'Ã':'A', 'Ä':'A', 'Å':'A', 'Ā':'A', 'Ă':'A',
       'Ą':'A', 'Ǎ':'A', 'Ǟ':'A', 'Ǡ':'A', 'Ǻ':'A', 'Ȁ':'A', 'Ȃ':'A', 'Ȧ':'A',
       'Ḁ':'A', 'Ạ':'A', 'Ả':'A', 'Ấ':'A', 'Ầ':'A', 'Ẩ':'A', 'Ẫ':'A', 'Ậ':'A',
       'Ắ':'A', 'Ằ':'A', 'Ẳ':'A', 'Ẵ':'A', 'Ặ':'A', 'Å':'A', 'Ḃ':'B', 'Ḅ':'B',
       'Ḇ':'B', 'Ç':'C', 'Ć':'C', 'Ĉ':'C', 'Ċ':'C', 'Č':'C', 'Ḉ':'C', 'Ď':'D',
       'Ḋ':'D', 'Ḍ':'D', 'Ḏ':'D', 'Ḑ':'D', 'Ḓ':'D', 'È':'E', 'É':'E', 'Ê':'E',
       'Ë':'E', 'Ē':'E', 'Ĕ':'E', 'Ė':'E', 'Ę':'E', 'Ě':'E', 'Ȅ':'E', 'Ȇ':'E',
       'Ȩ':'E', 'Ḕ':'E', 'Ḗ':'E', 'Ḙ':'E', 'Ḛ':'E', 'Ḝ':'E', 'Ẹ':'E', 'Ẻ':'E',
       'Ẽ':'E', 'Ế':'E', 'Ề':'E', 'Ể':'E', 'Ễ':'E', 'Ệ':'E', 'Ḟ':'F', 'Ĝ':'G',
       'Ğ':'G', 'Ġ':'G', 'Ģ':'G', 'Ǧ':'G', 'Ǵ':'G', 'Ḡ':'G', 'Ĥ':'H', 'Ȟ':'H',
       'Ḣ':'H', 'Ḥ':'H', 'Ḧ':'H', 'Ḩ':'H', 'Ḫ':'H', 'Ì':'I', 'Í':'I', 'Î':'I',
       'Ï':'I', 'Ĩ':'I', 'Ī':'I', 'Ĭ':'I', 'Į':'I', 'İ':'I', 'Ǐ':'I', 'Ȉ':'I',
       'Ȋ':'I', 'Ḭ':'I', 'Ḯ':'I', 'Ỉ':'I', 'Ị':'I', 'Ĵ':'J', 'Ķ':'K', 'Ǩ':'K',
       'Ḱ':'K', 'Ḳ':'K', 'Ḵ':'K', 'Ĺ':'L', 'Ļ':'L', 'Ľ':'L', 'Ḷ':'L', 'Ḹ':'L',
       'Ḻ':'L', 'Ḽ':'L', 'Ḿ':'M', 'Ṁ':'M', 'Ṃ':'M', 'Ñ':'N', 'Ń':'N', 'Ņ':'N',
       'Ň':'N', 'Ǹ':'N', 'Ṅ':'N', 'Ṇ':'N', 'Ṉ':'N', 'Ṋ':'N', 'Ò':'O', 'Ó':'O',
       'Ô':'O', 'Õ':'O', 'Ö':'O', 'Ō':'O', 'Ŏ':'O', 'Ő':'O', 'Ơ':'O', 'Ǒ':'O',
       'Ǫ':'O', 'Ǭ':'O', 'Ȍ':'O', 'Ȏ':'O', 'Ȫ':'O', 'Ȭ':'O', 'Ȯ':'O', 'Ȱ':'O',
       'Ṍ':'O', 'Ṏ':'O', 'Ṑ':'O', 'Ṓ':'O', 'Ọ':'O', 'Ỏ':'O', 'Ố':'O', 'Ồ':'O',
       'Ổ':'O', 'Ỗ':'O', 'Ộ':'O', 'Ớ':'O', 'Ờ':'O', 'Ở':'O', 'Ỡ':'O', 'Ợ':'O',
       'Ṕ':'P', 'Ṗ':'P', 'Ŕ':'R', 'Ŗ':'R', 'Ř':'R', 'Ȑ':'R', 'Ȓ':'R', 'Ṙ':'R',
       'Ṛ':'R', 'Ṝ':'R', 'Ṟ':'R', 'Ś':'S', 'Ŝ':'S', 'Ş':'S', 'Š':'S', 'Ș':'S',
       'Ṡ':'S', 'Ṣ':'S', 'Ṥ':'S', 'Ṧ':'S', 'Ṩ':'S', 'Ţ':'T', 'Ť':'T', 'Ț':'T',
       'Ṫ':'T', 'Ṭ':'T', 'Ṯ':'T', 'Ṱ':'T', 'Ù':'U', 'Ú':'U', 'Û':'U', 'Ü':'U',
       'Ũ':'U', 'Ū':'U', 'Ŭ':'U', 'Ů':'U', 'Ű':'U', 'Ų':'U', 'Ư':'U', 'Ǔ':'U',
       'Ǖ':'U', 'Ǘ':'U', 'Ǚ':'U', 'Ǜ':'U', 'Ȕ':'U', 'Ȗ':'U', 'Ṳ':'U', 'Ṵ':'U',
       'Ṷ':'U', 'Ṹ':'U', 'Ṻ':'U', 'Ụ':'U', 'Ủ':'U', 'Ứ':'U', 'Ừ':'U', 'Ử':'U',
       'Ữ':'U', 'Ự':'U', 'Ṽ':'V', 'Ṿ':'V', 'Ŵ':'W', 'Ẁ':'W', 'Ẃ':'W', 'Ẅ':'W',
       'Ẇ':'W', 'Ẉ':'W', 'Ẋ':'X', 'Ẍ':'X', 'Ý':'Y', 'Ŷ':'Y', 'Ÿ':'Y', 'Ȳ':'Y',
       'Ẏ':'Y', 'Ỳ':'Y', 'Ỵ':'Y', 'Ỷ':'Y', 'Ỹ':'Y', 'Ź':'Z', 'Ż':'Z', 'Ž':'Z',
       'Ẑ':'Z', 'Ẓ':'Z', 'Ẕ':'Z',
       '`': '`',
       'à':'a', 'á':'a', 'â':'a', 'ã':'a', 'ä':'a', 'å':'a', 'ā':'a', 'ă':'a',
       'ą':'a', 'ǎ':'a', 'ǟ':'a', 'ǡ':'a', 'ǻ':'a', 'ȁ':'a', 'ȃ':'a', 'ȧ':'a',
       'ḁ':'a', 'ạ':'a', 'ả':'a', 'ấ':'a', 'ầ':'a', 'ẩ':'a', 'ẫ':'a', 'ậ':'a',
       'ắ':'a', 'ằ':'a', 'ẳ':'a', 'ẵ':'a', 'ặ':'a', 'ḃ':'b', 'ḅ':'b', 'ḇ':'b',
       'ç':'c', 'ć':'c', 'ĉ':'c', 'ċ':'c', 'č':'c', 'ḉ':'c', 'ď':'d', 'ḋ':'d',
       'ḍ':'d', 'ḏ':'d', 'ḑ':'d', 'ḓ':'d', 'è':'e', 'é':'e', 'ê':'e', 'ë':'e',
       'ē':'e', 'ĕ':'e', 'ė':'e', 'ę':'e', 'ě':'e', 'ȅ':'e', 'ȇ':'e', 'ȩ':'e',
       'ḕ':'e', 'ḗ':'e', 'ḙ':'e', 'ḛ':'e', 'ḝ':'e', 'ẹ':'e', 'ẻ':'e', 'ẽ':'e',
       'ế':'e', 'ề':'e', 'ể':'e', 'ễ':'e', 'ệ':'e', 'ḟ':'f', 'ĝ':'g', 'ğ':'g',
       'ġ':'g', 'ģ':'g', 'ǧ':'g', 'ǵ':'g', 'ḡ':'g', 'ĥ':'h', 'ȟ':'h', 'ḣ':'h',
       'ḥ':'h', 'ḧ':'h', 'ḩ':'h', 'ḫ':'h', 'ẖ':'h', 'ì':'i', 'í':'i', 'î':'i',
       'ï':'i', 'ĩ':'i', 'ī':'i', 'ĭ':'i', 'į':'i', 'ǐ':'i', 'ȉ':'i', 'ȋ':'i',
       'ḭ':'i', 'ḯ':'i', 'ỉ':'i', 'ị':'i', 'ĵ':'j', 'ǰ':'j', 'ķ':'k', 'ǩ':'k',
       'ḱ':'k', 'ḳ':'k', 'ḵ':'k', 'ĺ':'l', 'ļ':'l', 'ľ':'l', 'ḷ':'l', 'ḹ':'l',
       'ḻ':'l', 'ḽ':'l', 'ḿ':'m', 'ṁ':'m', 'ṃ':'m', 'ñ':'n', 'ń':'n', 'ņ':'n',
       'ň':'n', 'ǹ':'n', 'ṅ':'n', 'ṇ':'n', 'ṉ':'n', 'ṋ':'n', 'ò':'o', 'ó':'o',
       'ô':'o', 'õ':'o', 'ö':'o', 'ō':'o', 'ŏ':'o', 'ő':'o', 'ơ':'o', 'ǒ':'o',
       'ǫ':'o', 'ǭ':'o', 'ȍ':'o', 'ȏ':'o', 'ȫ':'o', 'ȭ':'o', 'ȯ':'o', 'ȱ':'o',
       'ṍ':'o', 'ṏ':'o', 'ṑ':'o', 'ṓ':'o', 'ọ':'o', 'ỏ':'o', 'ố':'o', 'ồ':'o',
       'ổ':'o', 'ỗ':'o', 'ộ':'o', 'ớ':'o', 'ờ':'o', 'ở':'o', 'ỡ':'o', 'ợ':'o',
       'ṕ':'p', 'ṗ':'p', 'ŕ':'r', 'ŗ':'r', 'ř':'r', 'ȑ':'r', 'ȓ':'r', 'ṙ':'r',
       'ṛ':'r', 'ṝ':'r', 'ṟ':'r', 'ś':'s', 'ŝ':'s', 'ş':'s', 'š':'s', 'ș':'s',
       'ṡ':'s', 'ṣ':'s', 'ṥ':'s', 'ṧ':'s', 'ṩ':'s', 'ţ':'t', 'ť':'t', 'ț':'t',
       'ṫ':'t', 'ṭ':'t', 'ṯ':'t', 'ṱ':'t', 'ẗ':'t', 'ù':'u', 'ú':'u', 'û':'u',
       'ü':'u', 'ũ':'u', 'ū':'u', 'ŭ':'u', 'ů':'u', 'ű':'u', 'ų':'u', 'ư':'u',
       'ǔ':'u', 'ǖ':'u', 'ǘ':'u', 'ǚ':'u', 'ǜ':'u', 'ȕ':'u', 'ȗ':'u', 'ṳ':'u',
       'ṵ':'u', 'ṷ':'u', 'ṹ':'u', 'ṻ':'u', 'ụ':'u', 'ủ':'u', 'ứ':'u', 'ừ':'u',
       'ử':'u', 'ữ':'u', 'ự':'u', 'ṽ':'v', 'ṿ':'v', 'ŵ':'w', 'ẁ':'w', 'ẃ':'w',
       'ẅ':'w', 'ẇ':'w', 'ẉ':'w', 'ẘ':'w', 'ẋ':'x', 'ẍ':'x', 'ý':'y', 'ÿ':'y',
       'ŷ':'y', 'ȳ':'y', 'ẏ':'y', 'ẙ':'y', 'ỳ':'y', 'ỵ':'y', 'ỷ':'y', 'ỹ':'y',
       'ź':'z', 'ż':'z', 'ž':'z', 'ẑ':'z', 'ẓ':'z', 'ẕ':'z'
      };
      diacriticMappingTable = SC.diacriticMappingTable;
    }

    var original, replacement, ret = "",
        length = str.length;

    for (var i = 0; i <= length; ++i) {
      original = str.charAt(i);
      replacement = diacriticMappingTable[original];
      ret += replacement || original;
    }
    return ret;
  },


  /**
    Converts a word into its plural form.

    @param {String} str String to pluralize
    @returns {String} the plural form of the string
  */
  pluralize: function(str) {
      var idx, len,
          compare = str.split(/\s/).pop(), //check only the last word of a string
          restOfString = str.replace(compare,''),
          isCapitalized = compare.charAt(0).match(/[A-Z]/) ? true : false;

      compare = compare.toLowerCase();
      for (idx=0, len=SC.INFLECTION_CONSTANTS.UNCOUNTABLE.length; idx < len; idx++) {
          var uncountable = SC.INFLECTION_CONSTANTS.UNCOUNTABLE[idx];
          if (compare == uncountable) {
              return str.toString();
          }
      }
      for (idx=0, len=SC.INFLECTION_CONSTANTS.IRREGULAR.length; idx < len; idx++) {
          var singular = SC.INFLECTION_CONSTANTS.IRREGULAR[idx][0],
              plural   = SC.INFLECTION_CONSTANTS.IRREGULAR[idx][1];
          if ((compare == singular) || (compare == plural)) {
              if(isCapitalized) plural = plural.capitalize();
              return restOfString + plural;
          }
      }
      for (idx=0, len=SC.INFLECTION_CONSTANTS.PLURAL.length; idx < len; idx++) {
          var regex          = SC.INFLECTION_CONSTANTS.PLURAL[idx][0],
              replace_string = SC.INFLECTION_CONSTANTS.PLURAL[idx][1];
          if (regex.test(compare)) {
              return str.replace(regex, replace_string);
          }
      }
  },

  /**
    Converts a word into its singular form.

    @param {String} str String to singularize
    @returns {String} the singular form of the string
  */
  singularize: function(str) {
      var idx, len,
          compare = str.split(/\s/).pop(), //check only the last word of a string
          restOfString = str.replace(compare,''),
          isCapitalized = compare.charAt(0).match(/[A-Z]/) ? true : false;

      compare = compare.toLowerCase();
      for (idx=0, len=SC.INFLECTION_CONSTANTS.UNCOUNTABLE.length; idx < len; idx++) {
          var uncountable = SC.INFLECTION_CONSTANTS.UNCOUNTABLE[idx];
          if (compare == uncountable) {
              return str.toString();
          }
      }
      for (idx=0, len=SC.INFLECTION_CONSTANTS.IRREGULAR.length; idx < len; idx++) {
          var singular = SC.INFLECTION_CONSTANTS.IRREGULAR[idx][0],
              plural   = SC.INFLECTION_CONSTANTS.IRREGULAR[idx][1];
          if ((compare == singular) || (compare == plural)) {
              if(isCapitalized) singular = singular.capitalize();
              return restOfString + singular;
          }
      }
      for (idx=0, len=SC.INFLECTION_CONSTANTS.SINGULAR.length; idx < len; idx++) {
          var regex          = SC.INFLECTION_CONSTANTS.SINGULAR[idx][0],
              replace_string = SC.INFLECTION_CONSTANTS.SINGULAR[idx][1];
          if (regex.test(compare)) {
              return str.replace(regex, replace_string);
          }
      }
  }

});

/** @private */
SC.String.strip = SC.String.trim;

/* >>>>>>>>>> BEGIN source/ext/string.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('system/string');

SC.supplement(String.prototype, {

  /**
    @see SC.String.capitalizeEach
  */
  capitalizeEach: function() {
    return SC.String.capitalizeEach(this, arguments);
  },

  /**
    @see SC.String.titleize
  */
  titleize: function(str) {
    return SC.String.titleize(this, arguments);
  },

  /**
    @see SC.String.classify
  */
  classify: function(str) {
    return SC.String.classify(this, arguments);
  },

  /**
    @see SC.String.humanize
  */
  humanize: function(str) {
    return SC.String.humanize(this, arguments);
  },

  /**
    @see SC.String.escapeForRegExp
  */
  escapeForRegExp: function(str) {
    return SC.String.escapeForRegExp(this, arguments);
  },

  /**
    @see SC.String.removeDiacritics
  */
  removeDiacritics: function(str) {
    return SC.String.removeDiacritics(this, arguments);
  },

  /**
    @see SC.String.trim
  */
  trim: function(str) {
    return SC.String.trim(this, arguments);
  },

  /**
    @see SC.String.trimLeft
  */
  trimLeft: function (str) {
    return SC.String.trimLeft(this, arguments);
  },

  /**
    @see SC.String.trimRight
  */
  trimRight: function (str) {
    return SC.String.trimRight(this, arguments);
  },

  /**
    @see SC.String.pluralize
  */
  pluralize: function(str) {
    return SC.String.pluralize(this, arguments);
  },

  /**
    @see SC.String.singularize
  */
  singularize: function(str) {
    return SC.String.singularize(this, arguments);
  }

});
/* >>>>>>>>>> BEGIN source/system/gesture.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


/**
  @class
  
  An SC.Gesture analyzes SC.Touch objects and determines if they are part
  of a gesture. If they are, SC.Gestures keep the views that own them up-to-date
  as that gesture progresses, informing it when it starts, when some aspect of
  it changes, when it ends, and—for convenience—when it is considered to have
  been "triggered".
  
  Gestures can call the following methods on their views:
  
  - [gestureName](gesture, args...): called when the gesture has occurred. This is 
    useful for event-style gestures, where you aren't interested in when it starts or
    ends, but just that it has occurred. SC.SwipeGesture triggers this after the
    swipe has moved a minimum amount—40px by default.

  - [gestureName]Start(gesture, args...): called when the gesture is first recognized. 
    For instance, a swipe gesture may be recognized after the finger has moved a 
    minimum distance in a horizontal.
    
  - [gestureName]Changed(gesture, args...): called when some property of the gesture 
    has changed. For instance, this may be called continuously as the user swipes as 
    the swipe's distance changes.
  
  - [gestureName]Cancelled(gesture, args...): called when a gesture, for one reason 
    or another, is no longer recognized. For instance, a horizontal swipe gesture 
    could cancel if the user moves too far in a vertical direction.
  
  - [gestureName]End(gesture, args...): called when a gesture ends. A swipe would end
    when the user lifts their finger.
  
  Gesture Lifecycle
  ------------------------
  Gestures start receiving events when their view—usually mixing in SC.Gesturable—tells it
  about activities with "unassigned" touches. "Unassigned" touches are touches that have
  not _yet_ been assigned to a gesture.
  
  The touch becomes "assigned" when the gesture's touchIsInGesture method returns YES.
  When a tocuh is assigned to a gesture, the gesture becomes the touch's touch responder;
  this means that it will receive a touchStart event (to which it must return YES), and
  then, all further touch events will be sent _directly_ to the gesture—the gesture's view
  will not receive them at all.
  
  At any point, the gesture may tell the view that it has started, ended, or changed. In
  addition, the gesture may tell the view it has been "triggered." A gesture is not
  necessarily "triggered" when it starts and ends; for instance, a swipe gesture might
  only be triggered if the swipe moves more than a specified amount. The ability to track
  when the gesture has been triggered allows views to easily handle the gesture as its own
  event, rather than as the individual events that are part of it.
  
  If, at some point, the gesture must release the touch back (perhaps the gesture had _thought_
  the touch was a part of it, but turned out to be incorrect), the release(touch) method releases
  it back to the view.
  
  Exclusivity
  ---------------------------------
  The concept described above gives the gestures a way to be either exclusive or inclusive as-needed:
  they can choose to take exclusive control of a touch if they think it is theirs, but if they are
  not sure, they can wait and see.
  
  Status Object
  ---------------------------------
  It is a common need to track some data related to the touch, but without modifying the touch itself.
  SC.Gesture is able to keep track of simple hashes for you, mapping them to the SC.Touch object,
  so that you can maintain some state related to the touch.
  
  For instance, you could set status.failed in touchesDragged, if a touch that you previously
  thought may have been part of the gesture turned out not to be, and then check for 
  status.failed in touchIsInGesture, returning NO if present. This would cause the touch
  to never be considered for your gesture again.
  
  touchIsInGesture is called with the status hash provided in the second argument. You may look
  up the status hash for a touch at any time by calling this.statusForTouch(touch).
  
  
  Implementing a Gesture
  ---------------------------------
  To write a gesture, you would generally implement the following methods:
  
  - touchIsInGesture: Return YES when the touch is—or is likely enough to be that you
    want your gesture to have exclusive control over the touch. You usually do not
    perform much gesture logic here—instead, you save it for touchStart, which will
    get called after you return YES from this method.
  
  - touchStart: Return YES to accept control of the touch. If you do not return YES,
    your gesture will not receive touchesDragged nor touchEnd events. At this point,
    you may (or may not) wish to tell the view that the gesture has started by using the
    start(args...) method.
    
  - touchesDragged: Use this as you would use it in an SC.View to track the touches
    assigned to the gesture. At this point, you might want to tell the view that the
    gesture has updated by using the change(args...) method.
  
  - touchEnd: Again, use this like you would in an SC.View to track when touches
    assigned to the gesture have ended. This is also a potential time to alert the view
    that the gesture has ended, by using the end(args...) method. Further, this may
    also be the time to "trigger" the gesture.
  
*/
SC.Gesture = SC.Object.extend({
  /**
    The gesture's name. When calling events on the owning SC.View, this name will
    be prefixed to the methods. For instance, if the method to be called is
    'Start', and the gesture's name is 'swipe', SC.Gesture will call 'swipeStart'.
  */
  name: "gesture",

  /**
    Return YES to take exclusive control over the touch. In addition to the
    SC.Touch object you may take control of, you are also provided a "status"
    hash, which is unique for both the gesture instance and the touch instance,
    which you may use for your own purposes. 
  */
  touchIsInGesture: function(touch, status) {
    return NO;
  },
  
  /**
    After you return YES from touchIsInGesture (or otherwise 'take' a touch, perhaps
    using the 'take' method), touchStart will be called.
    
    This is where you do any logic needed now that the touch is part of the gesture.
    For instance, you could inform the view that the gesture has started by calling
    this.start().
    
    NOTE: SC.Gesture is just like SC.View in that it has an acceptsMultitouch property.
    If NO (the default), the gesture will only receive touchStart for the first touch
    assigned to it, and only receive touchEnd for the last touch that ends.
  */
  touchStart: function(touch) {
    
  },
  
  /**
    Called when touches assigned to the gesture have moved.
    
    This is where you update the gesture's state, potentially calling change() to
    notify the view.
  */
  touchesDragged: function(evt, touches) {
    
  },
  
  /**
    Called when a touch assigned to the gesture ends.
    
    If there are no remaining touches on the gesture, you may want to call end() to
    notify the view that the gesture has ended (if you haven't ended the gesture
    already).
    
    NOTE: SC.Gesture is just like SC.View in that it has an acceptsMultitouch property.
    If NO (the default), the gesture will only receive touchStart for the first touch
    assigned to it, and only receive touchEnd for the last touch that ends.
  */
  touchEnd: function(touch) {
    
  },
  
  /**
    Starts the gesture (marking it as "active"), and notifies the view.
    
    You can pass any number of arguments to start. They will, along with
    the gesture instance itself, will be passed to the appropriate gesture 
    event on the SC.View.
  */
  start: function() {
    if (!this.get("isActive")) {
      this.set("isActive", YES);
      
      var args = SC.$A(arguments);
      args.unshift(this);
      
      var act = this.name + "Start";
      if (this.view[act]) this.view[act].apply(this.view, args);
    }
  },
  
  /**
    Ends the gesture, if it is active (marking it as not active), and notifies
    the view.
    
    You may pass any number of arguments to end(). They, along with your gesture
    instance itself, will be passed to the appropriate gesture event on the SC.View.
  */
  end: function() {
    if (this.get("isActive")) {
      this.set("isActive", NO);

      var args = SC.$A(arguments);
      args.unshift(this);
      
      var act = this.name + "End";
      if (this.view[act]) this.view[act].apply(this.view, args);
    }
  },
  
  /**
    If the gesture is active, notifies the view that the gesture has
    changed.
    
    The gesture, along with any arguments to change(), will be passed to
    the appropriate method on the SC.View.
  */
  change: function() {
    if (this.get('isActive')) {
      var args = SC.$A(arguments);
      args.unshift(this);

      var act = this.name + "Changed";
      if (this.view[act]) this.view[act].apply(this.view, args);
    }
  },

  /**
    Cancels the gesture, if it is active, and notifies the view that the
    gesture has been cancelled.
    
    Gestures are cancelled when they have ended, but any action that would
    normally be appropriate due to their ending should not be performed.
    
    The gesture, along with any arguments to cancel(), will be passed to the
    appropriate method on the SC.View.
  */
  cancel: function(){
    if (this.get('isActive')) {
      this.set('isActive', NO);

      var args = SC.$A(arguments);
      args.unshift(this);

      var act = this.name + "Cancelled";
      if (this.view[act]) this.view[act].apply(this.view, args);
    }
  },
  
  /**
    Triggers the gesture, notifying the view that the gesture has happened.
    
    You should trigger a gesture where it would be natural to say it has "happened";
    for instance, if a touch moves a couple of pixels, you probably wouldn't say
    a swipe has occurred—though you might say it has "begun." And you wouldn't necessarily
    wait until the touch has ended either. Once the touch has moved a certain amount,
    there has definitely been a swipe. By calling trigger() at this point, you will
    tell the view that it has occurred.
    
    For SC.SwipeGesture, this allows a view to implement only swipe(), and then be 
    automatically notified whenever any swipe has occurred.
  */
  trigger: function() {
    var args = SC.$A(arguments);
    args.unshift(this);
    
    var act = this.name;
    if (this.view[act]) this.view[act].apply(this.view, args);
  },

  /**
    Takes possession of a touch. This does not take effect immediately; it takes effect after
    the run loop finishes to prevent it from being called during another makeTouchResponder.
    
    This is called automatically when you return YES from touchIsInGesture.
  */
  take: function(touch) {
    touch.isTaken = YES; // because even changing responder won't prevent it from being used this cycle.
    if (SC.none(touch.touchResponder) || touch.touchResponder !== this) touch.makeTouchResponder(this, YES);
  },
  
  /**
    Releases a touch back to its previous owner, which is usually the view. This allows
    you to give back control of a touch that it turns out is not part of the gesture. 
    
    This takes effect immediately, because you would usually call this from
    touchesDragged or such.
  */
  release: function(touch) {
    touch.isTaken = NO;
    if (touch.nextTouchResponder) touch.makeTouchResponder(touch.nextTouchResponder);
  },
  
  /**
    Discards a touch, making its responder null. This makes the touch go away and never
    come back—not to this gesture, nor to any other, nor to the view, nor to any other
    view.
  */
  discardTouch: function(touch) {
    touch.isTaken = YES; // because even changing responder won't prevent it from being used this cycle.
    touch.makeTouchResponder(null);
  },
  
  /**
    Returns a status hash (which gestures may and should modify) for a given touch, for tracking
    whether it is a potential match, etc.
  */
  statusForTouch: function(touch) {
    var key = SC.guidFor(touch.view) + this.name;
    var status = touch[key];
    if (!status) status = touch[key] = {};
    return status;
  },
  
  /**
    Called when an unassigned touch has started. By default, this calls touchIsInGesture, and,
    if it returns YES, takes possesion of the touch (causing touchStart to  be called).
  */
  unassignedTouchDidStart: function(touch) {
    if (touch.isTaken) return;
    if (this.touchIsInGesture(touch, this.statusForTouch(touch))) {
      this.take(touch);
    }
  },
  
  /**
    This is called when the unassigned touches (touches not in a gesture) change or move
    in some way. By default, this calls touchIsInGesture(touch, status) for each touch.
  */
  unassignedTouchesDidChange: function(evt, touches) {
    touches.forEach(function(touch) {
      if (touch.isTaken) return;
      if (this.touchIsInGesture(touch, this.statusForTouch(touch))) {
        this.take(touch);
      }
    }, this);
  },
  
  /**
    This is called when the unassigned touches (touches not in the gesture) have ended.
    Default does nothing. Some gestures may want to implement this even if they don't implement
    unassignedTouchesDidChange.
  */
  unassignedTouchDidEnd: function(touch) {
    
  },
  
  /**
    Marks the touch as "interesting" to this gesture. A view could then check the 'isInteresting'
    property of the touch to see if any gestures are interested in it, potentially delaying any
    action of releasing the touch to another view.
  */
  interestedInTouch: function(touch) {
    var status = this.statusForTouch(touch);
    if (status.isInterested) return;
    status.isInterested = YES;
    touch.isInteresting++;
  },
  
  /**
    Marks the touch as "uninteresting" to this gesture.
  */
  uninterestedInTouch: function(touch) {
    var status = this.statusForTouch(touch);
    if (!status.isInterested) return;
    status.isInterested = NO;
    touch.isInteresting--;
  }
});

/* >>>>>>>>>> BEGIN source/gestures/pinch.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require("system/gesture");

/*
  TODO Document this class
*/

/**
  @class
  @extends SC.Gesture
*/
SC.PinchGesture = SC.Gesture.extend(
/** @scope SC.PinchGesture.prototype */{

  /**
    @type String
    @default "pinch"
    @readOnly
  */
  name: "pinch",

  /**
    @type Boolean
    @default YES
    @readOnly
  */
  acceptsMultitouch: YES,

  /**
    @type Number
    @default 1
  */
  scale: 1,

  /**
    The default for this method is to loop through each touch one by one to see if it qualifies.
    Here, however, we want to take the touches when there are 2, and only 2 of them. As a result
    we can do the work here, with no need to pass them on.
    
    @param {Event} evt The touch event
    @param {Array} touches All touches
  */
  unassignedTouchesDidChange: function(evt, touches) {
    if (touches.length == 2) {
      this.take(touches[0]);
      this.take(touches[1]);
    }
  },

  /**
    We could probably just return YES here, since unassignedTouchesDidChange shouldn't let more
    than 2 touches through, however, we're double checking here to make sure that we haven't
    already captured 2 touches.
    
    @param {Touch} touch
    @returns {Boolean} YES if there were none or one touches prior to this, NO otherwise
  */
  touchStart: function(touch) {
    var touches = touch.touchesForResponder(this);
    if (!touches || touches.length === 0) {
      return YES;
    } else if (touches.length == 1) {
      this.start([touches[0], touch]);
      return YES;
    } else {
      return NO;
    }
  },

  /**
    Here we're getting the distance between the 2 touches and comparing it to their starting
    distance. It's possible we'll want to implement a more complex algorithm to make things
    a bit smoother. Once we have the relative change, we trigger the pinch action in the view.
    
    @param {Event} evt
    @param {Array} touches
  */
  touchesDragged: function(evt, touches) {
    var touch = touches.firstObject(),
        avg = touch.averagedTouchesForView(this);

    if (avg.touchCount == 2) {
      if (!this._startDistance) {
        this._startDistance = avg.d;
      }

      this.scale = avg.d / this._startDistance;

      this.change(touches, this.scale);
    }
  },

  /**
    Once one touch has ended we don't need to watch the other so we release all touches.
    
    @param {SC.Touch} touch
  */
  touchEnd: function(touch) {
    this._startDistance = null;

    var touches = touch.touchesForResponder(this);

    this.trigger(touches, this.scale);
    this.end(touches, this.scale);

    if (touches) {
      touches.forEach(function(touch){
        this.release(touch);
      }, this);
    }
  }

});

/* >>>>>>>>>> BEGIN source/gestures/swipe.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require("system/gesture");

/*
  TODO Document this class
*/

/**
  @static
  @type String
  @constant
*/
SC.SWIPE_HORIZONTAL = "X";

/**
  @static
  @type String
  @constant
*/
SC.SWIPE_VERTICAL = "Y";

/**
  @static
  @type String
  @constant
*/
SC.SWIPE_ANY = "XY";

/**
  @static
  @type String
  @constant
*/
SC.SWIPE_LEFT = "LEFT";

/**
  @static
  @type String
  @constant
*/
SC.SWIPE_RIGHT = "RIGHT";

/**
  @static
  @type String
  @constant
*/
SC.SWIPE_UP = "UP";

/**
  @static
  @type String
  @constant
*/
SC.SWIPE_DOWN = "DOWN";

/**
  @class
  @extends SC.Gesture
*/
SC.SwipeGesture = SC.Gesture.extend(
/** @scope SC.SwipeGesture.prototype */ {

  /**
    @type String
    @default "swipe"
    @readOnly
  */
  name: "swipe",

  /**
    @type Boolean
    @default YES
    @readOnly
  */
  acceptsMultitouch: YES,

  /**
    @type String
    @default SC.SWIPE_HORIZONTAL
  */
  direction: SC.SWIPE_HORIZONTAL,

  /**
    Will be populated with the current direction of the swipe once
    one has been determined.
    
    @type String
    @default null
  */
  currentDirection: null,

  /**
    @type Number
    @default 5
  */
  startDistance: 5,

  /**
    @type Number
    @default 40
  */
  swipeDistance: 40,
  
  /**
    Amount of distance in the other direction to consider it a swipe
    
    @type Number
    @default 0.5
  */
  tolerance: 0.5,
  
  /** @private */
  touchIsInGesture: function(touch, status) {
    // if we have not "flunked" the touch before, and it has moved 
    if (!status.flunked) {
      var d = this.get('direction'),
          cd = this.get('currentDirection'),
          startDistance = this.get('startDistance'),
          deltaX = touch.pageX - touch.startX,
          deltaY = touch.pageY - touch.startY,
          absX = Math.abs(deltaX),
          absY = Math.abs(deltaY);

      if (Math.abs(deltaX) > startDistance || Math.abs(deltaY) > startDistance) {

        if (!cd) {
          if (d == SC.SWIPE_ANY) {
            if      (absX > absY) cd = SC.SWIPE_HORIZONTAL;
            else if (absY > absX) cd = SC.SWIPE_VERTICAL;
            else                      return NO; // We can't determine a direction yet
          } else {
            cd = d;
          }
          this.set('currentDirection', cd);
        }

        var delta  = (cd == SC.SWIPE_HORIZONTAL) ? deltaX : deltaY,
            oDelta = (cd == SC.SWIPE_HORIZONTAL) ? deltaY : deltaX;

        if (Math.abs(delta) * this.get("tolerance") > Math.abs(oDelta)) {
          return YES;
        }

      }
    }
    return NO;
  },
  
  /** @private */
  touchStart: function(touch) {
    var d = this.get("currentDirection"), 
        delta = touch["page" + d] - touch["start" + d],
        swipeDirection;
    
    if (delta < 0) swipeDirection = (d === SC.SWIPE_HORIZONTAL) ? SC.SWIPE_LEFT : SC.SWIPE_UP;
    else swipeDirection = (d === SC.SWIPE_HORIZONTAL) ? SC.SWIPE_RIGHT : SC.SWIPE_DOWN;
    
    this.start(touch, swipeDirection, delta);
    return YES;
  },
  
  /** @private */
  touchesDragged: function(evt, touches) {
    var touch = touches.firstObject();
    var d = this.get("currentDirection"), 
        o = (d === SC.SWIPE_HORIZONTAL ? "Y" : "X"),
        delta = touch["page" + d] - touch["start" + d],
        oDelta = touch["page" + o] - touch["start" + o],
        swipeDirection;
    
    if (delta < 0) swipeDirection = (d === SC.SWIPE_HORIZONTAL) ? SC.SWIPE_LEFT : SC.SWIPE_UP;
    else swipeDirection = (d === SC.SWIPE_HORIZONTAL) ? SC.SWIPE_RIGHT : SC.SWIPE_DOWN;
    
    if (
      Math.abs(delta) < this.get("startDistance") ||
      Math.abs(delta) * this.get("tolerance") < Math.abs(oDelta)
    ) {
      // does not qualify anymore
      this.release(touch);

      var allTouches = touch.touchesForResponder(this);
      if (!allTouches || allTouches.length === 0) this.cancel(touch, swipeDirection, delta);
    } else {
      this.change(touch, swipeDirection, delta);
    }
  },
  
  /** @private */
  touchEnd: function(touch) {
    var d = this.get("currentDirection"), 
        o = (d === SC.SWIPE_HORIZONTAL ? "Y" : "X"),
        delta = touch["page" + d] - touch["start" + d],
        oDelta = touch["page" + o] - touch["start" + o],
        swipeDirection;
    
    // determine swipe direction
    if (delta < 0) swipeDirection = (d === SC.SWIPE_HORIZONTAL) ? SC.SWIPE_LEFT : SC.SWIPE_UP;
    else swipeDirection = (d === SC.SWIPE_HORIZONTAL) ? SC.SWIPE_RIGHT : SC.SWIPE_DOWN;

    // trigger
    if (
      Math.abs(delta) > this.get("swipeDistance") ||
      Math.abs(delta) * this.get("tolerance") < Math.abs(oDelta)
    ) {
      this.trigger(touch, swipeDirection);
    }

    this.end(touch, swipeDirection, delta);

    this.set('currentDirection', null);

    // and release all others
    var touches = touch.touchesForResponder(this);
    if (touches) {
      touches.forEach(function(touch){
        this.release(touch);
      }, this);
    }
  },

  /** @private */
  cancel: function(){
    arguments.callee.base.apply(this,arguments);
    this.set('currentDirection', null);
  }

});
/* >>>>>>>>>> BEGIN source/gestures/tap.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2010 Strobe Inc. All rights reserved.
// Author:    Peter Wagenet
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require("system/gesture");

/**
  @class
  @extends SC.Gesture
*/
SC.TapGesture = SC.Gesture.extend(
/** @scope SC.TapGesture.prototype */{

  /**
    @type String
    @default "tap"
    @readOnly
  */
  name: "tap",

  /**
    @type Boolean
    @default NO
    @readOnly
  */
  acceptsMultitouch: NO,

  /** @private */
  _tapCount: null,
  
  /** @private */
  _candidateTouch: null,
  
  /** @private */
  _eventTimer: null,

  /**
    @type Number
    @default 20
  */
  tapWiggle: 10,

  /**
    @type Number
    @default 200
  */
  tapDelay: 200,

  /** @private */
  touchIsInGesture: function(touch, status) {
    return !touch.tapFlunked;
  },

  /** @private */
  touchStart: function(touch) {
    // We don't want events triggering during a touch, will be reset when touch is over if it's a candidate
    if (this._eventTimer) this._eventTimer.invalidate();

    // We have an activeTap but another touch has been started
    if (this._candidateTouch && this._candidateTouch.touch.identifier !== touch.identifier) {
      this._cancelTap(touch);
      return NO;
    }

    // This touch is a candidate
    this._candidateTouch = {
      startTime: Date.now(),
      touch: touch
    };

    this.start(touch);

    return YES;
  },

  /** @private */
  touchesDragged: function(evt, touches) {
    var touch = touches[0];

    // Somehow another touch got in
    var tooManyTouches = (
      touches.length > 1 ||
      !this._candidateTouch ||
      touch.identifier !== this._candidateTouch.touch.identifier
    );

    // Touch moved too much
    var touchMoved = this._calculateDragDistance(touch) > this.get('tapWiggle');

    if (tooManyTouches || touchMoved) this._cancelTap(touch);
  },

  /** @private */
  touchEnd: function(touch){
    if (this._calculateDragDistance(touch) > this.get('tapWiggle') || Date.now() - this._candidateTouch.startTime > this.get('tapDelay') ) {
      // Touch moved too much or took too long
      this._cancelTap(touch);
    } else {
      this._addTap(touch);
    }
  },

  /** @private */
  _addTap: function(touch){
    var self = this;

    if (this._eventTimer) this._eventTimer.invalidate();

    this._tapCount = (this._tapCount || 0) + 1;
    this._candidateTouch = null;
    this._eventTimer = SC.Timer.schedule({
      target: self,
      action: function(){ this._triggerTap(touch); },
      interval: this.get('tapDelay')
    });

    this.change(touch, this._tapCount);
    this.trigger(touch, this._tapCount);

  },

  /** @private */
  _cancelTap: function(touch){
    // We don't set this on the touchStatus because the status is
    // linked to an individual view/gesture and we want this to be
    // global. If it's not a tap somewhere, it's not a tap anywhere.
    touch.tapFlunked = YES;

    this.release(touch);
    this.cancel(touch, this._tapCount);

    if (this._eventTimer) this._eventTimer.invalidate();
    this._tapCount = null;
    this._candidateTouch = null;
    this._eventTimer = null;

  },

  /** @private */
  _triggerTap: function(touch){
    this.end(touch, this._tapCount);

    this._tapCount = null;
    this._candidateTouch = null;
    this._eventTimer = null;
  },

  /** @private */
  _calculateDragDistance: function(touch) {
    return Math.sqrt(Math.pow(touch.pageX - touch.startX, 2) + Math.pow(touch.pageY - touch.startY, 2));
  }

});


/* >>>>>>>>>> BEGIN source/license.js */
/** 
 * @license Portions of this software are copyright Yahoo, Inc, used under the following license:
 * Software License Agreement (BSD License)
 * Copyright (c) 2009, Yahoo! Inc.
 * All rights reserved.
 * Redistribution and use of this software in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 * 
 * Redistributions of source code must retain the above copyright notice, this list of conditions and the
 * following disclaimer.
 * Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 * Neither the name of Yahoo! Inc. nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission of Yahoo! Inc.
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 * 
 * Sources of Intellectual Property Included in the YUI Library
 * Where not otherwise indicated, all YUI content is authored by Yahoo! engineers and consists of Yahoo!-owned intellectual property. YUI is issued by Yahoo! under the BSD license above. In some specific instances, YUI will incorporate work done by developers outside of Yahoo! with their express permission.

*/

/** 
 * @license jQuery 1.2.6 - New Wave Javascript
 * 
 * Copyright (c) 2008 John Resig (jquery.com)
 * Dual licensed under the MIT (MIT-LICENSE.txt)
 * and GPL (GPL-LICENSE.txt) licenses.
 *  
 * $Date: 2008-05-24 14:22:17 -0400 (Sat, 24 May 2008) $
 * $Rev: 5685 $
*/
/* >>>>>>>>>> BEGIN source/mixins/auto_mixin.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/**
  @namespace

  Use this mixin to automatically mix in a list of mixins into all
  child views created _by the view_ (that are created at view initialization).

  @since SproutCore 1.0
*/
SC.AutoMixin = {

  /**
    An array of mixins to automatically mix in to each child view of this
    view when the child view is created.

    @type Array
    @default []
  */
  autoMixins: [],

  /**
    @private
    Override createChildViews to mix in the mixins defined in autoMixins.
  */
  createChildView: function (view, attrs) {
    if (!view.isClass) {
      attrs = view;
    } else {
      // attrs should always exist...
      if (!attrs) { attrs = {}; }
      // clone the hash that was given so we do not pollute it if it's being reused
      else { attrs = SC.clone(attrs); }
    }

    attrs.owner = attrs.parentView = this;
    if (!attrs.page) attrs.page = this.page;

    if (view.isClass) {
      // Track that we created this view.
      attrs.createdByParent = true;

      // Add the mixins to the child's attributes.
      var applyMixins = SC.clone(this.get("autoMixins"));
      applyMixins.push(attrs);

      view = view.create.apply(view, applyMixins);
    }

    return view;
  }

};

/* >>>>>>>>>> BEGIN source/system/utils/string_measurement.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

SC.mixin( /** @scope SC */ {

  _copy_computed_props: [
    "maxWidth", "maxHeight", "paddingLeft", "paddingRight", "paddingTop", "paddingBottom",
    "fontFamily", "fontSize", "fontStyle", "fontWeight", "fontVariant", "lineHeight",
    "whiteSpace", "letterSpacing", "wordWrap"
  ],

  /**
    Returns a string representation of the layout hash.

    Layouts can contain the following keys:
      - left: the left edge
      - top: the top edge
      - right: the right edge
      - bottom: the bottom edge
      - height: the height
      - width: the width
      - centerX: an offset from center X
      - centerY: an offset from center Y
      - minWidth: a minimum width
      - minHeight: a minimum height
      - maxWidth: a maximum width
      - maxHeight: a maximum height
      - rotateX
      - rotateY
      - rotateZ
      - scale

    @param layout {Hash} The layout hash to stringify.
    @returns {String} A string representation of the layout hash.
  */
  stringFromLayout: function(layout) {
    // Put them in the reverse order that we want to display them, because
    // iterating in reverse is faster for CPUs that can compare against zero
    // quickly.
    var keys = ['maxHeight', 'maxWidth', 'minHeight', 'minWidth', 'centerY',
                'centerX', 'width', 'height', 'bottom', 'right', 'top',
                'left', 'zIndex', 'opacity', 'border', 'borderLeft',
                'borderRight', 'borderTop', 'borderBottom', 'rotateX',
                'rotateY', 'rotateZ', 'scale'],
        keyValues = [], key,
        i = keys.length;
    while (--i >= 0) {
      key = keys[i];
      if (layout.hasOwnProperty(key)) {
        keyValues.push(key + ':' + layout[key]);
      }
    }

    return '{ ' + keyValues.join(', ') + ' }';
  },

  /**
    Given a string and a fixed width, calculates the height of that
    block of text using a style string, a set of class names,
    or both.

    @param str {String} The text to calculate
    @param width {Number} The fixed width to assume the text will fill
    @param style {String} A CSS style declaration.  E.g., 'font-weight: bold'
    @param classNames {Array} An array of class names that may affect the style
    @param ignoreEscape {Boolean} To NOT html escape the string.
    @returns {Number} The height of the text given the passed parameters
  */
  heightForString: function(str, width, style, classNames, ignoreEscape) {
    var elem = this._heightCalcElement, classes, height;

    if(!ignoreEscape) str = SC.RenderContext.escapeHTML(str);

    // Coalesce the array of class names to one string, if the array exists
    classes = (classNames && SC.typeOf(classNames) === SC.T_ARRAY) ? classNames.join(' ') : '';

    if (!width) width = 100; // default to 100 pixels

    // Only create the offscreen element once, then cache it
    if (!elem) {
      elem = this._heightCalcElement = document.createElement('div');
      document.body.insertBefore(elem, null);
    }

    style = style+'; width: '+width+'px; left: '+(-1*width)+'px; position: absolute';
    var cqElem = SC.$(elem);
    cqElem.attr('style', style);

    if (classes !== '') {
      cqElem.attr('class', classes);
    }

    elem.innerHTML = str;
    height = elem.clientHeight;

    elem = null; // don't leak memory
    return height;
  },

  /**
    Sets up a string measuring environment.

    You may want to use this, in conjunction with teardownStringMeasurement and
    measureString, instead of metricsForString, if you will be measuring many
    strings with the same settings. It would be a lot more efficient, as it
    would only prepare and teardown once instead of several times.

    @param exampleElement The example element to grab styles from, or the style
                          string to use.
    @param classNames {String} (Optional) Class names to add to the test element.
  */
  prepareStringMeasurement: function(exampleElement, classNames) {
    var element = this._metricsCalculationElement, classes, styles, style,
        cqElem;

    // collect the class names
    classes = SC.A(classNames).join(' ');

    // get the calculation element
    if (!element) {
      var parentElement = document.createElement("div");

      // To have effectively unbounded widths when no max-width is set,
      // give the metricsCalculationElement a very wide sandbox.
      // To make sure it's never visible, position it way, way offscreen.
      parentElement.style.cssText = "position:absolute; left:-10010px; top:-10px;"+
                                    "width:10000px; height:0px; overflow:hidden;"+
                                    "visibility:hidden;";

      element = this._metricsCalculationElement = document.createElement("div");

      parentElement.appendChild(element);
      document.body.insertBefore(parentElement, null);
    }

    cqElem = SC.$(element);
    // two possibilities: example element or type string
    if (SC.typeOf(exampleElement) != SC.T_STRING) {
      var computed = null;
      if (document.defaultView && document.defaultView.getComputedStyle) {
        computed = document.defaultView.getComputedStyle(exampleElement, null);
      } else {
      computed = exampleElement.currentStyle;
      }

      var props = this._copy_computed_props;

      // firefox ONLY allows this method
      for (var i = 0; i < props.length; i++) {
        var prop = props[i], val = computed[prop];
        element.style[prop] = val;
      }

      // and why does firefox specifically need "font" set?
      var cs = element.style; // cached style
      if (cs.font === "") {
        var font = "";
        if (cs.fontStyle) font += cs.fontStyle + " ";
        if (cs.fontVariant) font += cs.fontVariant + " ";
        if (cs.fontWeight) font += cs.fontWeight + " ";
        if (cs.fontSize) font += cs.fontSize; else font += "10px"; //force a default
        if (cs.lineHeight) font += "/" + cs.lineHeight;
        font += " ";
        if (cs.fontFamily) font += cs.fontFamily; else cs += "sans-serif";

        element.style.font = font;
      }

      SC.mixin(element.style, {
        left: "0px", top: "0px", position: "absolute", bottom: "auto", right: "auto", width: "auto", height: "auto"
      });
     // clean up
      computed = null;
    } else {
      // it is a style string already
      style = exampleElement;

      // set style
      cqElem.attr("style", style + "; position:absolute; left: 0px; top: 0px; bottom: auto; right: auto; width: auto; height: auto;");
    }

    element.className = classes;
    element = null;
  },

  /**
    Tears down the string measurement environment. Usually, this doesn't _have_
    to be called, but there are too many what ifs: for example, what if the measurement
    environment has a bright green background and is over 10,000px wide? Guess what: it will
    become visible on the screen.

    So, generally, we tear the measurement environment down so that it doesn't cause issue.
    However, we keep the DOM element for efficiency.
  */
  teardownStringMeasurement: function() {
    var element = this._metricsCalculationElement;

    // clear element
    element.innerHTML = "";
    element.className = "";
    element.setAttribute("style", ""); // get rid of any junk from computed style.
    element = null;
  },

  /**
    Measures a string in the prepared environment.

    An easier and simpler alternative (but less efficient for bulk measuring) is metricsForString.

    @param string {String} The string to measure.
    @param ignoreEscape {Boolean} To NOT html escape the string.
  */
  measureString: function(string, ignoreEscape) {
    var element = this._metricsCalculationElement,
    padding = 0;

    if (!element) {
      throw new Error("measureString requires a string measurement environment to be set up. Did you mean metricsForString?");
    }

    // since the string has already been escaped (if the user wants it to be),
    // we should set the innerHTML instead of innertext
    if(ignoreEscape) element.innerHTML = string;
    // the conclusion of which to use (innerText or textContent) should be cached
    else if (typeof element.innerText != "undefined") element.innerText = string;
    else element.textContent = string;

    // for some reason IE measures 1 pixel too small
    if(SC.browser.isIE) padding = 1;

    // generate result
    var result = {
      width: element.clientWidth + padding,
      height: element.clientHeight
    };

    // Firefox seems to be 1 px short at times, especially with non english characters.
    if (SC.browser.isMozilla) {
      result.width += 1;
    }

    element = null;
    return result;
  },

  /**
    Given a string and an example element or style string, and an optional
    set of class names, calculates the width and height of that block of text.

    To constrain the width, set max-width on the exampleElement or in the style string.

    @param string {String} The string to measure.
    @param exampleElement The example element to grab styles from, or the style string to use.
    @param classNames {String} (Optional) Class names to add to the test element.
    @param ignoreEscape {Boolean} To NOT html escape the string.
  */
  metricsForString: function(string, exampleElement, classNames, ignoreEscape) {
    SC.prepareStringMeasurement(exampleElement, classNames);
    var result = SC.measureString(string, ignoreEscape);
    SC.teardownStringMeasurement();
    return result;
  }

});

/* >>>>>>>>>> BEGIN source/mixins/auto_resize.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require("system/utils/string_measurement");

/**
  @class
  Use this mixin to make your view automatically resize based upon its value,
  title, or other string property. Only works for views that support automatic
  resizing.

  Supporting Automatic Resizing
  -------------------------------------
  To support automatic resizing, your view must provide these properties:

  - *`supportsAutoResize`.* Must be set to YES.

  - *`autoResizeLayer`* A DOM element to use as a template for resizing the
    view. Font sizes and other styles will be copied to the measuring element
    SproutCore uses to measure the text.

  - *`autoResizeText`.* The text to measure. A button view might make a proxy
    to its `displayTitle`, for instance.

  Your view may also supply:

  - *`autoResizePadding`.* An amount to add to the measured size. This may be either
    a single number to be added to both width and height, or a hash containing
    separate `width` and `height` properties.


  NOTE: these properties are not defined in the mixin itself because the supporting view,
  rather than the user of SC.AutoResize, will be providing the properties, and mixing
  SC.AutoResize into the view should not override these properties.
*/
SC.AutoResize = {
  /*@scope SC.AutoResize.prototype */

  /**
    If YES, automatically resizes the view (default). If NO, only measures,
    setting 'measuredSize' to the measured value (you can bind to measuredSize
    and update size manually).

    @type Boolean
    @default YES
  */
  shouldAutoResize: YES,

  /**
    If NO, prevents SC.AutoResize from doing anything at all.

    @type Boolean
    @default YES
  */
  shouldMeasureSize: YES,

  /**
    Caches sizes for measured strings. This cache does not have a max size, so
    should only be used when a view has a limited number of possible values.
    Multiple views that have the same batchResizeId will share the same cache.

    @type Boolean
    @default NO
  */
  shouldCacheSizes: NO,

  /**
    Determines if the view's width should be resized
    on calculation.

    @type Boolean
    @default YES
  */
  shouldResizeWidth: YES,

  /**
    Determines if the view's height should be resized
    on calculation. Default is NO to retain backwards
    compatibility.

    @type Boolean
    @default NO
  */
  shouldResizeHeight: NO,

  /**
    The measured size of the view's content (the value of the autoResizeField).
    This property is observable, and, if used in conjunction with setting
    shouldAutoResize to NO, allows you to customize the 'sizing' part, using
    SC.AutoResize purely for its measuring code.

    @type Rect
  */
  measuredSize: { width: 0, height: 0 },

  /**
    If provided, will limit the maximum width to this value.
  */
  maxWidth: null,

  /**
    If provided, will limit the maximum height to this value.
  */
  maxHeight: null,

  /**
    If YES, the view's text will be resized to fit the view. This is applied _after_ any
    resizing, so will only take affect if shouldAutoResize is off, or a maximum width/height
    is set.

    You also must set a minimum and maximum font size. Any auto resizing will happen at the
    maximum size, and then the text will be resized as necessary.
  */
  shouldAutoFitText: NO,

  /**
    If NO, the calculated font size may be any size between minFontSize and
    maxFontSize. If YES, it will only be either minFontSize or maxFontSize.

    @type Boolean
    @default NO
  */
  autoFitDiscreteFontSizes: NO,

  /**
    The minimum font size to use when automatically fitting text. If shouldAutoFitText is set,
    this _must_ be supplied.

    Font size is in pixels.
  */
  minFontSize: 12,

  /**
    The maximum font size to use when automatically fitting text. If shouldAutoFitText is set,
    this _must_ be supplied.

    Font size is in pixels.
  */
  maxFontSize: 20,

  /**
    If shouldAutoFitText is YES, this is the calculated font size.
  */
  calculatedFontSize: 20,

  fontPropertyDidChange: function() {
    if(this.get('shouldAutoFitText')) this.invokeLast(this.fitTextToFrame);
  }.observes('shouldAutoFitText', 'minFontSize', 'maxFontSize', 'measuredSize'),

  /**
    Observes the measured size and actually performs the resize if necessary.
  */
  measuredSizeDidChange: function() {
    var measuredSize = this.get('measuredSize'),
      calculatedWidth = measuredSize.width,
      calculatedHeight = measuredSize.height,
      paddingHeight, paddingWidth,
      autoResizePadding = this.get('autoResizePadding') || 0,
      maxWidth = this.get('maxWidth'),
      maxHeight = this.get('maxHeight');

    if (SC.typeOf(autoResizePadding) === SC.T_NUMBER) {
      paddingHeight = paddingWidth = autoResizePadding;
    } else {
      paddingHeight = autoResizePadding.height;
      paddingWidth = autoResizePadding.width;
    }

    calculatedHeight += paddingHeight;
    calculatedWidth += paddingWidth;

    if (this.get('shouldAutoResize')) {
      // if we are allowed to autoresize, adjust the layout
      if (this.get('shouldResizeWidth')) {
        if (maxWidth && calculatedWidth > maxWidth) {
          calculatedWidth = maxWidth;
        }
        this.set('calculatedWidth', calculatedWidth);

        this.adjust('width', calculatedWidth);
      }

      if (this.get('shouldResizeHeight')) {
        if (maxHeight && calculatedHeight > maxHeight) {
          calculatedHeight = maxHeight;
        }
        this.set('calculatedHeight', calculatedHeight);
        this.adjust('height', calculatedHeight);
      }
    }

  }.observes('shouldAutoResize', 'measuredSize', 'autoResizePadding', 'maxWidth', 'maxHeight', 'shouldResizeWidth', 'shouldResizeHeight'),

  /**
    @private
    Begins observing the auto resize field.
  */
  initMixin: function() {
    
    if (!this.get('supportsAutoResize')) {
      throw new Error("View `%@` does not support automatic resize. See documentation for SC.AutoResize".fmt(this));
    }
    
  },

  /**
    If this property is provided, all views that share the same value for this property will be resized as a batch for increased performance.

    @type String
  */
  batchResizeId: null,

  /**
    Schedules a measurement to happen later.
  */
  scheduleMeasurement: function() {
    var batchResizeId = this.get('batchResizeId');

    // only measure if we are visible, active, and the text or style actually changed
    if (!this.get('shouldMeasureSize') || !this.get('isVisibleInWindow') || (this.get('autoResizeText') === this._lastMeasuredText && batchResizeId === this._lastMeasuredId)) return;

    // batchResizeId is allowed to be undefined; views without an id will just
    // get measured one at a time
    SC.AutoResizeManager.scheduleMeasurementForView(this, batchResizeId);
  }.observes('isVisibleInWindow', 'shouldMeasureSize', 'autoResizeText', 'batchResizeId'),

  _lastMeasuredText: null,

  _cachedMetrics: function(key, value) {
    if(!this.get('shouldCacheSizes')) return;

    // if we don't have a tag, then it is unique per view
    // you shouldn't usually turn on caching without a tag, but it is supported
    var cacheSlot = SC.cacheSlotFor(this.get('batchResizeId') || this),
    autoResizeText = this.get('autoResizeText');

    if(value) cacheSlot[autoResizeText] = value;
    else value = cacheSlot[autoResizeText];

    return value;
  }.property('shouldCacheSizes', 'autoResizeText', 'batchResizeId').cacheable(),

  /**
    Measures the size of the view.

    @param batch For internal use during batch resizing.
  */
  measureSize: function(batch) {
    var metrics, layer = this.get('autoResizeLayer'), autoResizeText = this.get('autoResizeText'),
        ignoreEscape = !this.get('escapeHTML'),
        batchResizeId = this.get('batchResizeId'),
        cachedMetrics = this.get('_cachedMetrics'),
        maxFontSize = this.get('maxFontSize');

    if (!layer) return;

    // There are three special cases.
    //   - size is cached: the cached size is used with no measurement
    //     necessary
    //   - empty: we should do nothing. The metrics are 0.
    //   - batch mode: just call measureString.
    //
    // If we are in neither of those special cases, we should go ahead and
    // resize normally.
    //
    if(cachedMetrics) {
      metrics = cachedMetrics;
    }

    else if (SC.none(autoResizeText) || autoResizeText === "") {
      metrics = { width: 0, height: 0 };
    }

    else if (batch) {
      metrics = SC.measureString(autoResizeText, ignoreEscape);
    }

    else {
      this.prepareLayerForStringMeasurement(layer);

      metrics = SC.metricsForString(autoResizeText, layer, this.get('classNames'), ignoreEscape);
    }

    // In any case, we set measuredSize.
    this.set('measuredSize', metrics);

    // and update the cache if we are using it
    if(this.get('shouldCacheSizes')) this.setIfChanged('_cachedMetrics', metrics);

    // set the measured value so we can avoid extra measurements in the future
    this._lastMeasuredText = autoResizeText;
    this._lastMeasuredId = batchResizeId;

    return metrics;
  },


  //
  // FITTING TEXT
  //

  /**
    If we are fitting text, the layer must be measured with its font size set to our
    maximum font size.
  */
  prepareLayerForStringMeasurement: function(layer) {
    var maxFontSize = this.get('maxFontSize');

    if (this.get('shouldAutoFitText') && this.get('calculatedFontSize') !== maxFontSize) {
      layer.style.fontSize = maxFontSize + "px";
    }
  },

  /**
    Whenever the view resizes, the text fitting must be reevaluated.
  */
  viewDidResize: function(orig) {
    orig();

    this.fontPropertyDidChange();
  }.enhance(),

  /**
    Fits the text into the frame's size, minus autoResizePadding.
  */
  fitTextToFrame: function() {
    // we can only fit text when we have a layer.
    var layer = this.get('autoResizeLayer');
    if (!layer) return;

    var maxFontSize = this.get('maxFontSize'),
        minFontSize = this.get('minFontSize');

    // if the font size has been adjusted, reset it to the max
    this.prepareLayerForStringMeasurement(layer);

    var frame = this.get('frame'),

        padding = this.get('autoResizePadding') || 0,

        // these need to be shrunk by 1 pixel or text that is exactly as wide as
        // the frame will be truncated
        width = frame.width - 1, height = frame.height - 1,
        measured = this.get('measuredSize'),
        mWidth = measured.width, mHeight = measured.height;

    // figure out and apply padding to the width/height
    if(SC.typeOf(padding) === SC.T_NUMBER) {
      width -= padding;
      height -= padding;
    } else {
      width -= padding.width;
      height -= padding.height;
    }

    // measured size is at maximum. If there is no resizing to be done, short-circuit.
    if (mWidth <= width && mHeight <= height) return;

    // if only discrete values are allowed, we can short circuit here and just
    // use the minimum
    if(this.get('autoFitDiscreteFontSizes')) {
      actual = minFontSize;
    }

    // otherwise we have to find the actual best font size
    else {
      // now, we are going to make an estimate font size. We will figure out the proportion
      // of both actual width and actual height to the measured width and height, and then we'll
      // pick the smaller. We'll multiply that by the maximum font size to figure out
      // a rough guestimate of the proper font size.
      var xProportion = width / mWidth, yProportion = height / mHeight,

          guestimate = Math.floor(maxFontSize * Math.min(xProportion, yProportion)),
          actual,

          classNames = this.get('classNames'),
          ignoreEscape = !this.get('escapeHTML'),
          value = this.get('autoResizeText'),

          metrics;


      guestimate = actual = Math.min(maxFontSize, Math.max(minFontSize, guestimate));

      // Now, we must test the guestimate. Based on that, we'll either loop down
      // or loop up, depending on the measured size.
      layer.style.fontSize = guestimate + "px";
      metrics = SC.metricsForString(value, layer, classNames, ignoreEscape);

      if (metrics.width > width || metrics.height > height) {

        // if we're larger, we must go down until we are smaller, at which point we are done.
        for (guestimate = guestimate - 1; guestimate >= minFontSize; guestimate--) {
          layer.style.fontSize = guestimate + "px";
          metrics = SC.metricsForString(value, layer, classNames, ignoreEscape);

          // always have an actual in this case; even if we can't get it small enough, we want
          // to keep this as close as possible.
          actual = guestimate;

          // if the new size is small enough, stop shrinking and set it for real
          if (metrics.width <= width && metrics.height <= height) {
            break;
          }
        }

      } else if (metrics.width < width || metrics.height < height) {
        // if we're smaller, we must go up until we hit maxFontSize or get larger. If we get
        // larger, we want to use the previous guestimate (which we know was valid)
        //
        // So, we'll start actual at guestimate, and only increase it while we're smaller.
        for (guestimate = guestimate + 1; guestimate <= maxFontSize; guestimate++) {
          layer.style.fontSize = guestimate + "px";
          metrics = SC.metricsForString(value, layer, classNames, ignoreEscape);

          // we update actual only if it is still valid. Then below, whether valid
          // or not, if we are at or past the width/height we leave
          if (metrics.width <= width && metrics.height <= height) {
            actual = guestimate;
          }

          // we put this in a separate if statement JUST IN CASE it is ===.
          // Unlikely, but possible, and why ruin a good thing?
          if (metrics.width >= width || metrics.height >= height){
            break;
          }
        }
      }
    }

    layer.style.fontSize = actual + "px";
    this.set('calculatedFontSize', actual);
  },

  /**
    Extends renderSettingsToContext to add font size if shouldAutoFitText is YES.
  */
  applyAttributesToContext: function(orig, context) {
    orig(context);

    if (this.get('shouldAutoFitText')) {
      context.setStyle('font-size', this.get('calculatedFontSize') + "px");
    }
  }.enhance(),

  /**
    @private
    When the layer is first created, measurement will need to take place.
  */
  didCreateLayer: function(orig) {
    orig();

    this.scheduleMeasurement();
  }.enhance(),

  /** @private
    If the view has a transitionIn property, we have to delay the transition
    setup and execution until after we measure.  In order to prevent a brief
    flash of the view, we ensure it is hidden while it is being measured and
    adjusted.

    TODO: consider making the measurement state a formal SC.View state
  */
  _transitionIn: function (original) {
    // In order to allow views to measure and adjust themselves on append, we
    // can't transition until after the measurement is done.
    var preTransitionOpacity = this.get('layout').opacity || 1;

    this.adjust('opacity', 0);
    this.invokeNext(function () {
      this.adjust('opacity', preTransitionOpacity);
      original();
    });
  }.enhance()

};

/**
 * @private
 * @class
 * Manages batch auto resizing.
 *
 * This used to be part of SC.AutoResize, but we shouldn't mix these
 * methods/properties into each view.
 */
SC.AutoResizeManager = {
  /**
    Views queued for batch resizing, but with no batch resize id.

    @property {SC.CoreSet}
  */
  measurementQueue: SC.CoreSet.create(),

  /**
    Schedules a re-measurement for the specified view in the batch with the
    given id.

    If a batch does not exist by that id, it will be created. If there is no id,
    the view will be measured individually.

    @param view The view to measure.
    @param id The id of the batch to measure the view in.
  */
  scheduleMeasurementForView: function(view) {
    this.measurementQueue.add(view);

    SC.RunLoop.currentRunLoop.invokeLast(this.doBatchResize);
  },

  /**
    Cancels a scheduled measurement for a view in the named batch id.

    @param view The view that was scheduled for measurement.
    @param id The batch id the view was scheduled in.
  */
  cancelMeasurementForView: function(view, id) {
    this.measurementQueue.remove(view);
  },

  /**
    Processes all autoResize batches. This will automatically be invoked at the
    end of any run loop in which measurements were scheduled.
  */
  doBatchResize: function() {
    // make sure we are called from the correct scope.
    // this will make our property references below clearer.
    if (this !== SC.AutoResizeManager) {
      return SC.AutoResizeManager.doBatchResize();
    }

    var tag, view, layer, measurementQueue = this.measurementQueue, prepared, autoResizeText,
    i, len;

    while((len = measurementQueue.get('length')) > 0) {
      prepared = NO;
      // save the first tag we see
      tag = measurementQueue[len - 1].get('batchResizeId');

      // now we iterate over all the views with the same tag
      for(i = len - 1; i >= 0; --i) {
        view = measurementQueue[i];

        // if the view has a different tag, skip it
        if(view.get('batchResizeId') !== tag) continue;

        // make sure the view is still qualified to be measured
        if(view.get('isVisibleInWindow') && view.get('shouldMeasureSize') && (layer = view.get('autoResizeLayer'))) {
          autoResizeText = view.get('autoResizeText');

          // if the text is empty or a size is cached don't bother preparing
          if(!SC.none(autoResizeText) && autoResizeText !== "" && !view.get('_cachedMetrics') && !prepared) {
            // this is a bit of a hack: before we can prepare string measurement, there are cases where we
            // need to reset the font size first (specifically, if we are also fitting text)
            //
            // It is expected that all views in a batch will have the same font settings.
            view.prepareLayerForStringMeasurement(layer);

            // now we can tell SC to prepare the layer with the settings from the view's layer
            SC.prepareStringMeasurement(layer, view.get('classNames'));
            prepared = YES;
          }

          view.measureSize(YES);
        }

        // it's been handled
        measurementQueue.remove(view);

        // if the view didn't have a tag, we can't batch so just move on
        if(!tag) break;
      }

      // only call teardown if prepare was called
      if(prepared) {
        SC.teardownStringMeasurement();
      }
    }
  }
};

/* >>>>>>>>>> BEGIN source/mixins/button.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

if(SC.Button) {
  SC.Button.initMixin = function(){
    throw new Error("SC.Button is deprecated as a mixin and is now a subclass of SC.TemplateView. Subclass SC.ButtonView instead.");
  };
}


/* >>>>>>>>>> BEGIN source/mixins/content_display.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/**
  @namespace

  The SC.ContentDisplay mixin makes it easy to automatically update your view
  display whenever relevant properties on a content object change.  To use
  this mixin, include it in your view and then add the names of the
  properties on the content object you want to trigger a displayDidChange()
  method on your view. Your updateDisplay() method will then be called at the
  end of the run loop.

  ## Example

      MyApp.MyViewClass = SC.View.extend(SC.ContentDisplay, {
        contentDisplayProperties: 'title isEnabled hasChildren'.w(),
        ...
      });

  @since SproutCore 1.0
*/
SC.ContentDisplay = {

  /** @private */
  concatenatedProperties: 'contentDisplayProperties',

  /** @private */
  displayProperties: ['content'],

  /**
    Add an array with the names of any property on the content object that
    should trigger an update of the display for your view.  Changes to the
    content object will only invoke your display method once per runloop.

    @type Array
    @default []
  */
  contentDisplayProperties: [],

  /** @private
    Setup observers on the content object when initializing the mixin.
  */
  initMixin: function() {
    this._display_contentDidChange();
  },

  /**
   * Remove observer on existing content object, if present
   * @private
   */
  destroyMixin: function () {
    if (!this._display_content) return;
    this._display_stopObservingContent(this._display_content);
    this._display_content = null;
  },

  /** @private */
  _display_beginObservingContent: function(content) {
    var f = this._display_contentPropertyDidChange;

    if (SC.isArray(content)) {
      content.invoke('addObserver', '*', this, f);
    }
    else if (content.addObserver) {
      content.addObserver('*', this, f);
    }
  },

  /** @private */
  _display_stopObservingContent: function(content) {
    var f = this._display_contentPropertyDidChange;

    if (SC.isArray(content)) {
      content.invoke('removeObserver', '*', this, f);
    }
    else if (content.removeObserver) {
      content.removeObserver('*', this, f);
    }
  },

  /** @private */
  _display_contentDidChange: function(target, key, value) {
    // handle changes to the content...
    if ((value = this.get('content')) === this._display_content) return;

    // stop listening to old content.
    var content = this._display_content;
    if (content) this._display_stopObservingContent(content);

    // start listening for changes on the new content object.
    content = this._display_content = value;
    if (content) this._display_beginObservingContent(content);

    this.displayDidChange();
  }.observes('content'),

  /** @private Invoked when properties on the content object change. */
  _display_contentPropertyDidChange: function(target, key, value, propertyRevision) {
    if (key === '*') {
      this.displayDidChange() ;
    } else {
      // only update if a displayProperty actually changed...s
      var ary = this.get('contentDisplayProperties') ;
      if (ary && ary.indexOf(key)>=0) this.displayDidChange();
    }
  }

} ;

/* >>>>>>>>>> BEGIN source/mixins/content_value_support.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2010 Sprout Systems, Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/**
  @namespace

  This mixin allows a view to get its value from a content object based
  on the value of its contentValueKey.

      myView = SC.View.create({
        content: {prop: "abc123"},

        contentValueKey: 'prop'
      });

      // myView.get('value') will be "abc123"

  This is useful if you have a nested record structure and want to have
  it be reflected in a nested view structure. If your data structures
  only have primitive values, consider using SC.Control instead.
*/
SC.ContentValueSupport = {
  /**
    Walk like a duck.

    @type Boolean
    @default YES
  */
  hasContentValueSupport: YES,

  /** @private */
  initMixin: function () {
    // setup content observing if needed.
    this._control_contentKeysDidChange();
  },

  /** @private */
  destroyMixin: function () {
    // Remove old observers on self.
    this._cleanup_old_observers();

    // Remove old observers on content.
    this._cleanup_old_content_observers();
  },

  /**
    The value represented by this control.

    Most controls represent a value of some type, such as a number, string
    or image URL.  This property should hold that value.  It is bindable
    and observable.  Changing this value will immediately change the
    appearance of the control.  Likewise, editing the control
    will immediately change this value.

    If instead of setting a single value on a control, you would like to
    set a content object and have the control display a single property
    of that control, then you should use the content property instead.

    @type Object
    @default null
  */
  value: null,

  /**
    The content object represented by this control.

    Often you need to use a control to display some single aspect of an
    object, especially if you are using the control as an item view in a
    collection view.

    In those cases, you can set the content and contentValueKey for the
    control.  This will cause the control to observe the content object for
    changes to the value property and then set the value of that property
    on the "value" property of this object.

    Note that unless you are using this control as part of a form or
    collection view, then it would be better to instead bind the value of
    the control directly to a controller property.

    @type SC.Object
    @default null
  */
  content: null,

  /**
    Keys that should be observed on the content object and mapped to values on
    this object. Should be a hash of local keys that point to keys on the content to
    map to local values. For example, the default is {'contentValueKey': 'value'}.
    This means that the value of this.contentValueKey will be observed as a key on
    the content object and its value will be mapped to this.value.

    @type Hash
    @default null
  */
  contentKeys: null,

  _default_contentKeys: {
    contentValueKey: 'value'
  },

  /**
    The property on the content object that would want to represent the
    value of this control.  This property should only be set before the
    content object is first set.  If you have a displayDelegate, then
    you can also use the contentValueKey of the displayDelegate.

    @type String
    @default null
  */
  contentValueKey: null,

  /**
    Invoked whenever any property on the content object changes.

    The default implementation will update the value property of the view
    if the contentValueKey property has changed.  You can override this
    method to implement whatever additional changes you would like.

    The key will typically contain the name of the property that changed or
    '*' if the content object itself has changed.  You should generally do
    a total reset if '*' is changed.

    @param {Object} target the content object
    @param {String} key the property that changes
    @returns {void}
    @test in content
  */
  contentPropertyDidChange: function (target, key) {
    var contentKeys = this.get('contentKeys');

    if (contentKeys) {
      var contentKey;

      for (contentKey in contentKeys) {
        // if we found the specific contentKey, then just update that and we're done
        if (key === this.getDelegateProperty(contentKey, this, this.get('displayDelegate'), contentKeys)) {
          return this.updatePropertyFromContent(contentKeys[contentKey], key, contentKey, target);
        }

        // else if '*' is changed, then update for every contentKey
        else if (key === '*') {
          this.updatePropertyFromContent(contentKeys[contentKey], key, contentKey, target);
        }
      }
    }

    else {
      return this.updatePropertyFromContent('value', key, 'contentValueKey', target);
    }
  },

  /**
    Helper method you can use from your own implementation of
    contentPropertyDidChange().  This method will look up the content key to
    extract a property and then update the property if needed.  If you do
    not pass the content key or the content object, they will be computed
    for you.  It is more efficient, however, for you to compute these values
    yourself if you expect this method to be called frequently.

    @param {String} prop local property to update
    @param {String} key the contentproperty that changed
    @param {String} contentKey the local property that contains the key
    @param {Object} content
    @returns {SC.Control} receiver
  */
  updatePropertyFromContent: function (prop, key, contentKey, content) {
    var del, v;

    if (contentKey === undefined) contentKey = "content" + prop.capitalize() + "Key";

    // prefer our own definition of contentKey
    if (this[contentKey]) contentKey = this.get(contentKey);
    // if we don't have one defined check the delegate
    else if ((del = this.get('displayDelegate')) && (v = del[contentKey])) contentKey = del.get ? del.get(contentKey) : v;
    // if we have no key we can't do anything so just short circuit out
    else return this;

    // only bother setting value if the observer triggered for the correct key
    if (key === '*' || key === contentKey) {
      if (content === undefined) content = this.get('content');

      if (content) v = content.get ? content.get(contentKey) : content[contentKey];
      else v = null;

      this.setIfChanged(prop, v);
    }

    return this;
  },

  /**
    Relays changes to the value back to the content object if you are using
    a content object.

    This observer is triggered whenever the value changes.  It will only do
    something if it finds you are using the content property and
    contentValueKey and the new value does not match the old value of the
    content object.

    If you are using contentValueKey in some other way than typically
    implemented by this mixin, then you may want to override this method as
    well.

    @returns {void}
  */
  updateContentWithValueObserver: function (target, key) {
    var reverseContentKeys = this._reverseContentKeys;

    // if everything changed, iterate through and update them all
    if (!key || key === '*') {
      for (key in reverseContentKeys) {
        this.updateContentWithValueObserver(this, key);
      }
    }

    // get value -- set on content if changed
    var value = this.get(key);

    var content = this.get('content'),
    // get the key we should be setting on content, asking displayDelegate if
    // necessary
    contentKey = this.getDelegateProperty(reverseContentKeys[key], this, this.displayDelegate);

    // do nothing if disabled
    if (!contentKey || !content) return this;

    if (typeof content.setIfChanged === SC.T_FUNCTION) {
      content.setIfChanged(contentKey, value);
    }

    // avoid re-writing inherited props
    else if (content[contentKey] !== value) {
      content[contentKey] = value;
    }
  },

  /** @private
    This should be null so that if content is also null, the
    _contentDidChange won't do anything on init.
  */
  _control_content: null,
  _old_contentValueKeys: null,
  _old_contentKeys: null,

  /** @private
    Observes when a content object has changed and handles notifying
    changes to the value of the content object.

    Optimized for the default case of only observing contentValueKey. If you use
    a custom value for contentKeys it will switch to using a CoreSet to track
    observed keys.
  */
  _control_contentDidChange: function (target, key) {
    // remove an observer from the old content if necessary
    this._cleanup_old_content_observers();

    var content = this.get('content'),
    contentKeys = this.get('contentKeys'), contentKey,
    oldKeys = this._old_contentValueKeys,
    f = this.contentPropertyDidChange;

    // add observer to new content if necessary.
    if (content && content.addObserver) {
      // set case
      if (contentKeys) {
        // lazily create the key set
        if (!oldKeys) oldKeys = SC.CoreSet.create();

        // add observers to each key
        for (contentKey in contentKeys) {
          contentKey = this.getDelegateProperty(contentKey, this, this.get('displayDelegate'));

          if (contentKey) {
            content.addObserver(contentKey, this, f);

            oldKeys.add(contentKey);
          }
        }
      }

      // default case hardcoded for contentValueKey
      else {
        contentKey = this.getDelegateProperty('contentValueKey', this, this.get('displayDelegate'));

        if (contentKey) {
          content.addObserver(contentKey, this, f);

          // if we had a set before, continue using it
          if (oldKeys) oldKeys.add(contentKey);
          // otherwise just use a string
          else oldKeys = contentKey;
        }
      }
    }

    // notify that values did change.
    key = (!key || key === 'content') ? '*' : this.get(key);
    if (key) this.contentPropertyDidChange(content, key);

    // Cache values for clean up.
    this._control_content = content;
    this._old_contentValueKeys = oldKeys;
  }.observes('content'),

  /** @private
    Observes changes to contentKeys and sets up observers on the local keys to
    update the observers on the content object.
  */
  _control_contentKeysDidChange: function () {
    var key, reverse = {},
    // if no hash is present, use the default contentValueKey -> value
    contentKeys = this.get('contentKeys') || this._default_contentKeys,
    contentKey,
    f = this._control_contentDidChange,
    reverseF = this.updateContentWithValueObserver;

    // Remove old observers.
    this._cleanup_old_observers();

    // add new observers
    for (key in contentKeys) {
      contentKey = contentKeys[key];

      // build reverse mapping to update content with value
      reverse[contentKey] = key;

      // add value observer
      this.addObserver(contentKey, this, reverseF);

      // add content key observer
      this.addObserver(key, this, f);
    }

    // store reverse map for later use
    this._reverseContentKeys = reverse;

    this._old_contentKeys = contentKeys;

    // call the other observer now to update all the observers
    this._control_contentDidChange();
  }.observes('contentKeys'),

  /** @private */
  _cleanup_old_content_observers: function () {
    var old = this._control_content,
      oldKeys = this._old_contentValueKeys,
      oldType = SC.typeOf(oldKeys),
      f = this.contentPropertyDidChange,
      contentKey;

    if (old && old.removeObserver && oldKeys) {
      // default case
      if (oldType === SC.T_STRING) {
        old.removeObserver(oldKeys, this, f);

        this._old_contentValueKeys = oldKeys = null;
      }

      // set case
      else {
        var i, len = oldKeys.get('length');

        for (i = 0; i < len; i++) {
          contentKey = oldKeys[i];

          old.removeObserver(contentKey, this, f);
        }

        oldKeys.clear();
      }
    }
  },

  /** @private */
  _cleanup_old_observers: function () {
    var oldContentKeys = this._old_contentKeys,
      f = this._control_contentDidChange,
      reverseF = this.updateContentWithValueObserver,
      contentKey, key;

    // remove old observers
    for (key in oldContentKeys) {
      contentKey = oldContentKeys[key];

      this.removeObserver(contentKey, this, reverseF);
      this.removeObserver(key, this, f);
    }
  }
};


/* >>>>>>>>>> BEGIN source/mixins/control.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('mixins/content_value_support');
sc_require('system/string');

/**
  Option for controls to automatically calculate their size (should be default
  on controls that use renderers).

  @type String
  @constant
*/
SC.AUTO_CONTROL_SIZE = '__AUTO__';

/**
  Option for HUGE control size.

  @type String
  @constant
*/
SC.JUMBO_CONTROL_SIZE = 'sc-jumbo-size';

/**
  Option for HUGE control size.

  @type String
  @constant
*/
SC.HUGE_CONTROL_SIZE = 'sc-huge-size';

/**
  Option for large control size.

  @type String
  @constant
*/
SC.LARGE_CONTROL_SIZE = 'sc-large-size';

/**
  Option for standard control size.

  @type String
  @constant
*/
SC.REGULAR_CONTROL_SIZE = 'sc-regular-size';

/**
  Option for small control size.

  @type String
  @constant
*/
SC.SMALL_CONTROL_SIZE = 'sc-small-size';

/**
  Option for tiny control size

  @type String
  @constant
*/
SC.TINY_CONTROL_SIZE = 'sc-tiny-size';

/**
  @namespace

  A Control is a view that also implements some basic state functionality.
  Apply this mixin to any view that you want to have standard control
  functionality including showing a selected state, enabled state, focus
  state, etc.

  ## About Values and Content

  Controls typically are used to represent a single value, such as a number,
  boolean or string.  The value a control is managing is typically stored in
  a "value" property.  You will typically use the value property when working
  with controls such as buttons and text fields in a form.

  An alternative way of working with a control is to use it to manage some
  specific aspect of a content object.  For example, you might use a label
  view control to display the "name" property of a Contact record.  This
  approach is often necessary when using the control as part of a collection
  view.

  You can use the content-approach to work with a control by setting the
  "content" and "contentValueKey" properties of the control.  The
  "content" property is the content object you want to manage, while the
  "contentValueKey" is the name of the property on the content object
  you want the control to display.

  The default implementation of the Control mixin will essentially map the
  contentValueKey of a content object to the value property of the
  control.  Thus if you are writing a custom control yourself, you can simply
  work with the value property and the content object support will come for
  free.  Just write an observer for the value property and update your
  view accordingly.

  If you are working with a control that needs to display multiple aspects
  of a single content object (for example showing an icon and label), then
  you can override the contentValueDidChange() method instead of observing
  the value property.  This method will be called anytime _any_ property
  on the content object changes.  You should use this method to check the
  properties you care about on the content object and update your view if
  anything you care about has changed.

  ## Delegate Support

  Controls can optionally get the contentDisplayProperty from a
  displayDelegate, if it is set.  The displayDelegate is often used to
  delegate common display-related configurations such as which content value
  to show.  Anytime your control is shown as part of a collection view, the
  collection view will be automatically set as its displayDelegate.

  @since SproutCore 1.0
  @extends SC.ContentValueSupport
*/
SC.Control = SC.mixin(SC.clone(SC.ContentValueSupport),
/** @scope SC.Control.prototype */{

  /**
    Walk like a duck

    @type Boolean
    @default YES
    @readOnly
  */
  isControl: YES,

  /**
    The selected state of this control. Possible values:

      - `YES`
      - `NO`
      - SC.MIXED_STATE.

    @type Boolean
    @default NO
  */
  isSelected: NO,

  /** @private */
  isSelectedBindingDefault: SC.Binding.oneWay().bool(),

  /**
    Set to YES when the item is currently active.  Usually this means the
    mouse is current pressed and hovering over the control, however the
    specific implementation my vary depending on the control.

    Changing this property value by default will cause the Control mixin to
    add/remove an 'active' class name to the root element.

    @type Boolean
    @default NO
  */
  isActive: NO,

  /** @private */
  isActiveBindingDefault: SC.Binding.oneWay().bool(),

  /**
    The name of the property this control should display if it is part of an
    SC.FormView.

    If you add a control as part of an SC.FormView, then the form view will
    automatically bind the value to the property key you name here on the
    content object.

    @type String
    @default null
  */
  fieldKey: null,

  /**
    The human readable label you want shown for errors.  May be a loc string.

    If your field fails validation, then this is the name that will be shown
    in the error explanation.  If you do not set this property, then the
    fieldKey or the class name will be used to generate a human readable name.

    @type String
    @default null
  */
  fieldLabel: null,

  /**
    The human readable label for this control for use in error strings.  This
    property is computed dynamically using the following rules:

    If the fieldLabel is defined, that property is localized and returned.
    Otherwise, if the keyField is defined, try to localize using the string
    "ErrorLabel.{fieldKeyName}".  If a localized name cannot be found, use a
    humanized form of the fieldKey.

    Try to localize using the string "ErrorLabel.{ClassName}". Return a
    humanized form of the class name.

    @field
    @type String
    @observes 'fieldLabel'
    @observes 'fieldKey'
  */
  errorLabel: function () {
    var ret = this.get('fieldLabel'), fk, def, locFK;

    // Fast path!
    if (ret) return ret;

    // if field label is not provided, compute something...
    fk = this.get('fieldKey') || this.constructor.toString();
    def = fk ? SC.String.capitalize(SC.String.humanize(fk)) : '';
    locFK = SC.String.locWithDefault("FieldKey." + fk, def);
    return SC.String.locWithDefault("ErrorLabel." + fk, locFK);
  }.property('fieldLabel', 'fieldKey').cacheable(),

  /**
    The control size.  This will set a CSS style on the element that can be
    used by the current theme to vary the appearance of the control.

    Some controls will default to SC.AUTO_CONTROL_SIZE, which will allow you
    to simply size the control, and the most appropriate control size will
    automatically be picked; be warned, though, that if you don't specify
    a height, performance will be impacted as it must be calculated; if you do
    this, a warning will be issued. If you don't care, use SC.CALCULATED_CONTROL_SIZE.

    @type String
    @default SC.REGULAR_CONTROL_SIZE
  */
  controlSize: SC.REGULAR_CONTROL_SIZE,

  /** @private */
  displayProperties: ['isSelected', 'isActive', 'controlSize'],

  /** @private */
  _CONTROL_TMP_CLASSNAMES: {},

  /** @private
    Invoke this method in your updateDisplay() method to update any basic
    control CSS classes.
  */
  renderMixin: function (context, firstTime) {
    var sel = this.get('isSelected'),
      disabled = !this.get('isEnabledInPane'),
      // update the CSS classes for the control.  note we reuse the same hash
      // to avoid consuming more memory
      names = this._CONTROL_TMP_CLASSNAMES; // temporary object

    names.mixed = sel === SC.MIXED_STATE;
    names.sel = sel && (sel !== SC.MIXED_STATE);
    names.active = this.get('isActive');

    var controlSize = this.get("controlSize");
    if (!controlSize) {
      controlSize = SC.REGULAR_CONTROL_SIZE;
    }

    if (firstTime) {
      context.setClass(names);

      // delegates handle adding 'controlSize' on their own. We only support it
      // here for backwards-compatibility.
      if (!this.get('renderDelegate')) {
        context.addClass(controlSize);
      }
    } else {
      context.$().setClass(names);
      if (!this.get('renderDelegate')) {
        context.$().addClass(controlSize);
      }
    }

    // if the control implements the $input() helper, then fixup the input
    // tags
    if (!firstTime && this.$input) {
      var inps = this.$input();

      if (inps.attr('type') !== "radio") {
        this.$input().attr('disabled', disabled);
      }
    }
  }

});


/* >>>>>>>>>> BEGIN source/mixins/editable.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/**
  @namespace

  The Editable mixin is a standard protocol used to activate keyboard editing 
  on views that are editable such as text fields, label views and item views.
  
  You should apply this mixin, or implement the methods, if you are
  designing an item view for a collection and you want to automatically
  trigger editing.
  
  ## Using Editable Views
  
  To use a view that includes the Editable mixin, you simply call three
  methods on the view:
  
    - To begin editing, call beginEditing().  This will make the view first responder and allow the user to make changes to it.  If the view cannot begin editing for some reason, it will return NO.
    - If you want to cancel editing, you should try calling discardEditing().  This will cause the editor to discard its changed value and resign first responder.  Some editors do not support cancelling editing and will return NO.  If this is the case, you may optionally try calling commitEditing() instead to force the view to resign first responder, even though this will commit the changes.
    - If you want to end editing, while saving any changes that were made, try calling commitEditing().  This will cause the editor to validate and apply its changed value and resign first responder.  If the editor cannot validate its contents for some reason, it will return NO.  In this case you may optionally try calling discardEditing() instead to force the view to resign first responder, even though this will discard the changes.
  
  ## Implementing an Editable View
  
  To implement a new view that is editable, you should implement the three
  methods defined below: beginEditing(), discardEditing(), and
  commitEditing().  If you already allow editing when your view becomes first
  responder and commit your changes when the view loses first responder status
  then you can simply apply this mixin and not override any methods.
  
  
  @since SproutCore 1.0
*/
SC.Editable = {

  /**
    Indicates whether a view is editable or not.  You can optionally 
    implement the methods in this mixin to disallow editing is isEditable is
    NO.
    
    @type Boolean
    @default NO
  */
  isEditable: NO,
  
  /**
    Indicates whether editing is currently in progress.  The methods you
    implement should generally up this property as appropriate when you 
    begin and end editing.
    
    @type Boolean
    @default NO
  */
  isEditing: NO,
  
  /**
    Begins editing on the view.
    
    This method is called by other views when they want you to begin editing.
    You should write this method to become first responder, perform any 
    additional setup needed to begin editing and then return YES.
    
    If for some reason you do not want to allow editing right now, you can
    also return NO.  If your view is already editing, then you should not
    restart editing again but just return YES.

    The default implementation checks to see if editing is allowed, then
    becomes first responder and updates the isEditing property if appropriate.
    Generally you will want to replace this method with your own 
    implementation and not call the default.
    
    @returns {Boolean} YES if editing began or is in progress, NO otherwise
  */
  beginEditing: function() {
    if (!this.get('isEditable')) return NO ;
    if (this.get('isEditing')) return YES ;
    
    // begin editing
    this.beginPropertyChanges();
    this.set('isEditing', YES) ;
    this.becomeFirstResponder();
    this.endPropertyChanges();
    
    return YES ;
  },
  
  /**
    Ends editing on the view, discarding any changes that were made to the
    view value in the meantime.
    
    This method is called by other views when they want to cancel editing
    that began earlier.  When this method is called you should resign first
    responder, restore the original value of the view and return YES.
    
    If your view cannot revert back to its original state before editing began
    then you can implement this method to simply return NO.  A properly
    implemented client may try to call commitEditing() instead to force your
    view to end editing anyway.
    
    If this method is called on a view that is not currently editing, you
    should always just return YES.
    
    The default implementation does not support discarding changes and always
    returns NO.
    
    @returns {Boolean} YES if changes were discarded and editing ended.
  */
  discardEditing: function() {
    // if we are not editing, return YES, otherwise NO.
    
    return !this.get('isEditing') ;
  },
  
  /**
    Ends editing on the view, committing any changes that were made to the 
    view value in the meantime.
    
    This method is called by other views when they want to end editing, 
    saving any changes that were made to the view in the meantime.  When this
    method is called you should resign first responder, save the latest
    value of the view and return YES.
    
    If your view cannot save the current state of the view for some reason 
    (for example if validation fails), then you should return NO.  Properly
    implemented clients may then try to call discardEditing() to force your
    view to resign first responder anyway.
    
    Some views apply changes to their value immediately during an edit instead
    of waiting for the view to end editing.  If this is the case, you should
    still implement commitEditing but you simply may not save any value 
    changes.
  
    If this method is called on a view that is not currently editing, you
    should always just return YES.
    
    The default implementation sets isEditing to NO, resigns first responder
    and returns YES.
    
    @returns {Boolean} YES if changes were discarded and editing ended.
  */
  commitEditing: function() {
    if (!this.get('isEditing')) return YES;
    this.set('isEditing', NO) ;
    this.resignFirstResponder();
    
    return YES ;
  }

} ;

/* >>>>>>>>>> BEGIN source/mixins/flowed_layout.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/**
  @type String
  @constant
*/
SC.ALIGN_JUSTIFY = "justify";

/**
  @namespace

  Normal SproutCore views are absolutely positioned--parent views have relatively
  little input on where their child views are placed.

  This mixin makes a view layout its child views itself, flowing left-to-right
  or up-to-down, and, optionally, wrapping.

  Child views with useAbsoluteLayout===YES will be ignored in the layout process.
  This mixin detects when child views have changed their size, and will adjust accordingly.
  It also observes child views' isVisible and calculatedWidth/Height properties, and, as a
  flowedlayout-specific extension, isHidden.

  These properties are observed through `#js:observeChildLayout` and `#js:unobserveChildLayout`;
  you can override the method to add your own properties. To customize isVisible behavior,
  you will also want to override shouldIncludeChildInFlow.

  This relies on the children's frames or, if specified, calculatedWidth and calculatedHeight
  properties.

  This view mixes very well with animation. Further, it is able to automatically mix
  in to child views it manages, created or not yet created, allowing you to specify
  settings such as animation once only, and have everything "just work".

  Like normal views, you simply specify child views--everything will "just work."

  @since SproutCore 1.0
*/
SC.FlowedLayout = {
  isFlowedLayout: YES,
  /**
    The direction of flow. Possible values:

      - SC.LAYOUT_HORIZONTAL
      - SC.LAYOUT_VERTICAL

    @type String
    @default SC.LAYOUT_HORIZONTAL
  */
  layoutDirection: SC.LAYOUT_HORIZONTAL,

  /**
    Whether the view should automatically resize (to allow scrolling, for instance)

    @type Boolean
    @default YES
  */
  autoResize: YES,

  /**
    @type Boolean
    @default YES
  */
  shouldResizeWidth: YES,

  /**
    @type Boolean
    @default YES
  */
  shouldResizeHeight: YES,

  /**
    The alignment of items within rows or columns. Possible values:

      - SC.ALIGN_LEFT
      - SC.ALIGN_CENTER
      - SC.ALIGN_RIGHT
      - SC.ALIGN_JUSTIFY

    @type String
    @default SC.ALIGN_LEFT
  */
  align: SC.ALIGN_LEFT,

  /**
    If YES, flowing child views are allowed to wrap to new rows or columns.

    @type Boolean
    @default YES
  */
  canWrap: YES,

  /**
    A set of spacings (left, top, right, bottom) for subviews. Defaults to 0s all around.
    This is the amount of space that will be before, after, above, and below the view. These
    spacings do not collapse into each other.

    You can also set flowSpacing on any child view, or implement flowSpacingForView.

    @type Hash
    @default `{ left: 0, bottom: 0, top: 0, right: 0 }`
  */
  defaultFlowSpacing: { left: 0, bottom: 0, top: 0, right: 0 },

  /**
    @type Hash

    Padding around the edges of this flow layout view. This is useful for
    situations where you don't control the layout of the FlowedLayout view;
    for instance, when the view is the contentView for a SC.ScrollView.

    @type Hash
    @default `{ left: 0, bottom: 0, top: 0, right: 0 }`
  */
  flowPadding: { left: 0, bottom: 0, right: 0, top: 0 },

  /**
    @private

    If the flowPadding somehow misses a property (one of the sides),
    we need to make sure a default value of 0 is still there.
   */
  _scfl_validFlowPadding: function() {
    var padding = this.get('flowPadding') || {}, ret = {};
    ret.left = padding.left || 0;
    ret.top = padding.top || 0;
    ret.bottom = padding.bottom || 0;
    ret.right = padding.right || 0;
    return ret;
  }.property('flowPadding').cacheable(),

  concatenatedProperties: ['childMixins'],

  /** @private */
  initMixin: function() {
    this._scfl_tileOnce();
  },

  /** @private
    Detects when the child views change.
  */
  _scfl_childViewsDidChange: function(c) {
    this._scfl_tileOnce();
  }.observes('childViews'),

  /** @private */
  _scfl_layoutPropertyDidChange: function(childView) {
    this._scfl_tileOnce();
  }.observes('layoutDirection', 'align', 'flowPadding', 'canWrap', 'defaultFlowSpacing', 'isVisibleInWindow'),

  /** @private
    Overridden to only update if it is a view we do not manage, or the width or height has changed
    since our last record of it.
  */
  layoutDidChangeFor: function(c) {
    // now, check if anything has changed
    var l = c._scfl_lastLayout, cl = c.get('layout'), f = c.get('frame');
    if (!l) return arguments.callee.base.apply(this,arguments);

    var same = YES;

    // in short, if anything interfered with the layout, we need to
    // do something about it.
    if (l.left && l.left !== cl.left) same = NO;
    else if (l.top && l.top !== cl.top) same = NO;
    else if (!c.get('fillWidth') && l.width && l.width !== cl.width) same = NO;
    else if (!l.width && !c.get('fillWidth') && f.width !== c._scfl_lastFrame.width) same = NO;
    else if (!c.get('fillHeight') && l.height && l.height !== cl.height) same = NO;
    else if (!l.height && !c.get('fillHeight') && f.height !== c._scfl_lastFrame.height) same = NO;

    if (same) {
      return arguments.callee.base.apply(this,arguments);
    }

    // nothing has changed. This is where we do something
    this._scfl_tileOnce();
    arguments.callee.base.apply(this,arguments);
  },

  /** @private
    Sets up layout observers on child view. We observe three things:
    - isVisible
    - calculatedWidth
    - calculatedHeight

    Actual layout changes are detected through layoutDidChangeFor.
  */
  observeChildLayout: function(c) {
    if (c._scfl_isBeingObserved) return;
    c._scfl_isBeingObserved = YES;
    c.addObserver('flowSpacing', this, '_scfl_tileOnce');
    c.addObserver('isVisible', this, '_scfl_tileOnce');
    c.addObserver('useAbsoluteLayout', this, '_scfl_tileOnce');
    c.addObserver('calculatedWidth', this, '_scfl_tileOnce');
    c.addObserver('calculatedHeight', this, '_scfl_tileOnce');
    c.addObserver('startsNewRow', this, '_scfl_tileOnce');
    c.addObserver('isSpacer', this, '_scfl_tileOnce');
    c.addObserver('maxSpacerLength', this, '_scfl_tileOnce');
    c.addObserver('fillWidth', this, '_scfl_tileOnce');
    c.addObserver('fillHeight', this, '_scfl_tileOnce');
  },

  /** @private
    Removes observers on child view.
  */
  unobserveChildLayout: function(c) {
    c._scfl_isBeingObserved = NO;
    c.removeObserver('flowSpacing', this, '_scfl_tileOnce');
    c.removeObserver('isVisible', this, '_scfl_tileOnce');
    c.removeObserver('useAbsoluteLayout', this, '_scfl_tileOnce');
    c.removeObserver('calculatedWidth', this, '_scfl_tileOnce');
    c.removeObserver('calculatedHeight', this, '_scfl_tileOnce');
    c.removeObserver('startsNewRow', this, '_scfl_tileOnce');
    c.removeObserver('isSpacer', this, '_scfl_tileOnce');
    c.removeObserver('maxSpacerLength', this, '_scfl_tileOnce');
    c.removeObserver('fillWidth', this, '_scfl_tileOnce');
    c.removeObserver('fillHeight', this, '_scfl_tileOnce');
  },

  /**
    Determines whether the specified child view should be included in the flow layout.
    By default, if it has isVisible: NO or useAbsoluteLayout: YES, it will not be included.

    @field
    @type Boolean
    @default NO
  */
  shouldIncludeChildInFlow: function(idx, c) {
    return c.get('isVisible') && !c.get('useAbsoluteLayout');
  },

  /**
    Returns the flow spacings for a given view. By default, returns the view's flowSpacing,
    and if they don't exist, the defaultFlowSpacing for this view.

    @field
    @type Hash
  */
  flowSpacingForChild: function(idx, view) {
    var spacing = view.get('flowSpacing');
    if (SC.none(spacing)) spacing = this.get('defaultFlowSpacing');
    if (SC.none(spacing)) spacing = 0;

    if (SC.typeOf(spacing) === SC.T_NUMBER) {
      spacing = { left: spacing, right: spacing, bottom: spacing, top: spacing };
    } else {
      spacing['left'] = spacing['left'] || 0;
      spacing['right'] = spacing['right'] || 0;
      spacing['top'] = spacing['top'] || 0;
      spacing['bottom'] = spacing['bottom'] || 0;
    }

    return spacing;
  },

  /**
    Returns the flow size for a given view, excluding spacing. The default version
    checks the view's calculatedWidth/Height, then its frame.

    For spacers, this returns an empty size.

    @field
    @type Hash
    @default {width: 0, height: 0}
  */
  flowSizeForChild: function(idx, view) {
    var cw = view.get('calculatedWidth'), ch = view.get('calculatedHeight'),
    layoutDirection = this.get('layoutDirection'),
    calc = {}, f = view.get('frame'), l = view.get('layout');
    view._scfl_lastFrame = f;

    // if there is a calculated width, use that. NOTE: if calculatedWidth === 0,
    // it is invalid. This is the practice in other views.
    if (cw) {
      calc.width = cw;
    } else {
      // we should use the layout width if available to avoid breaking layouts
      // that have borders
      calc.width = l.width || f.width;
    }

    // same for calculated height
    if (ch) {
      calc.height = ch;
    } else {
      // we should use the layout width if available to avoid breaking layouts
      // that have borders
      calc.height = l.height || f.height;
    }

    // if it is a spacer, we must set the dimension that it
    // expands in to 0.
    if (view.get('isSpacer')) {
      calc.maxSpacerLength = view.get('maxSpacerLength');

      if (layoutDirection === SC.LAYOUT_HORIZONTAL) {
        calc.width = l.minWidth || 0;
      } else {
        calc.height = l.minHeight || 0;
      }
    }

    // if it has a fillWidth/Height, clear it for later
    if (layoutDirection === SC.LAYOUT_HORIZONTAL && view.get('fillHeight')) {
      calc.height = l.minHeight || 0;
    } else if (layoutDirection === SC.LAYOUT_VERTICAL && view.get('fillWidth')) {
      calc.width = l.minWidth || 0;
    }

    return calc;
  },

  /** @private */
  clippingFrame: function() {
    return { left: 0, top: 0, width: this.get('calculatedWidth'), height: this.get('calculatedHeight') };
  }.property('calculatedWidth', 'calculatedHeight'),

  /** @private */

  // the maximum row length when all flexible items are collapsed.
  _scfl_maxCollapsedRowLength: 0,

  // the total row size when all flexible rows are collapsed.
  _scfl_totalCollapsedRowSize: 0,


  _scfl_calculatedSizeDidChange: function() {
    if(this.get('autoResize')) {
      if (this.get('layoutDirection') == SC.LAYOUT_VERTICAL) {
        if (this.get('shouldResizeHeight')) {
          this.adjust('minHeight', this.get('_scfl_maximumCollapsedRowLength'));
        }

        if (this.get('shouldResizeWidth')) {
          this.adjust('minWidth', this.get('_scfl_totalCollapsedRowSize'));
        }
      } else {
        if (this.get('shouldResizeWidth')) {
          this.adjust('minWidth', this.get('_scfl_maximumCollapsedRowLength'));
        }
        if (this.get('shouldResizeHeight')) {
          this.adjust('minHeight', this.get('_scfl_totalCollapsedRowSize'));
        }
      }
    }
  }.observes('autoResize', 'shouldResizeWidth', '_scfl_maximumCollapsedRowLength', '_scfl_totalCollapsedRowSize', 'shouldResizeHeight'),

  /**
    @private
    Creates a plan, initializing all of the basic properties in it, but not
    doing anything further.

    Other methods should be called to do this:

    - _scfl_distributeChildrenIntoRows distributes children into rows.
    - _scfl_positionChildrenInRows positions the children within the rows.
      - this calls _scfl_positionChildrenInRow
    - _scfl_positionRows positions and sizes rows within the plan.

    The plan's structure is defined inside the method.

    Some of these methods may eventually be made public and/or delegate methods.
  */
  _scfl_createPlan: function() {
    var layoutDirection = this.get('layoutDirection'),
        flowPadding = this.get('_scfl_validFlowPadding'),
        frame = this.get('frame');

    var isVertical = (layoutDirection === SC.LAYOUT_VERTICAL);

    // A plan hash contains general information about the layout, and also,
    // the collection of rows.
    //
    // This method only fills out a subset of the properties in a plan.
    //
    var plan = {
      // The rows array starts empty. It will get filled out by the method
      // _scfl_distributeChildrenIntoRows.
      rows: undefined,


      // the maximum row length where all collapsible items are collapsed.
      maximumCollapsedRowLength: 0,

      // the total sizes of all rows when collapsed (With flex-height rows
      // at minimum size)
      totalCollapsedRowSize: 0,

      // These properties are calculated once here, but later used by
      // the various methods.
      isVertical: layoutDirection === SC.LAYOUT_VERTICAL,
      isHorizontal: layoutDirection === SC.LAYOUT_HORIZONTAL,

      flowPadding: flowPadding,

      planStartPadding: flowPadding[isVertical ? 'left' : 'top'],
      planEndPadding: flowPadding[isVertical ? 'right' : 'bottom'],

      rowStartPadding: flowPadding[isVertical ? 'top' : 'left'],
      rowEndPadding: flowPadding[isVertical ? 'bottom' : 'right'],

      maximumRowLength: undefined, // to be calculated below

      // if any rows need to fit to fill, this is the size to fill
      fitToPlanSize: undefined,


      align: this.get('align')
    };

    if (isVertical) {
      plan.maximumRowLength = frame.height - plan.rowStartPadding - plan.rowEndPadding;
      plan.fitToPlanSize = frame.width - plan.planStartPadding - plan.planEndPadding;
    } else {
      plan.maximumRowLength = frame.width - plan.rowStartPadding - plan.rowEndPadding;
      plan.fitToPlanSize = frame.height - plan.planStartPadding - plan.planEndPadding;
    }

    return plan;
  },

  /** @private */
  _scfl_distributeChildrenIntoRows: function(plan) {
    var children = this.get('childViews'), child, idx, len = children.length,
        isVertical = plan.isVertical, rows = [], lastIdx;

    lastIdx = -1; idx = 0;
    while (idx < len && idx !== lastIdx) {
      lastIdx = idx;

      var row = {
        // always a reference to the plan
        plan: plan,

        // the combined size of the items in the row. This is used, for instance,
        // in justification or right-alignment.
        rowLength: undefined,

        // the size of the row. When flowing horizontally, this is the height;
        // it is the opposite dimension of rowLength. It is calculated
        // both while positioning items in the row and while positioning the rows
        // themselves.
        rowSize: undefined,

        // whether this row should expand to fit any available space. In this case,
        // the size is the row's minimum size.
        shouldExpand: undefined,

        // to be decided by _scfl_distributeItemsIntoRows
        items: undefined,

        // to be decided by _scfl_positionRows
        position: undefined
      };

      idx = this._scfl_distributeChildrenIntoRow(children, idx, row);
      rows.push(row);
    }

    plan.rows = rows;
  },

  /**
    @private
    Distributes as many children as possible into a single row, stating
    at the given index, and returning the index of the next item, if any.
  */
  _scfl_distributeChildrenIntoRow: function(children, startingAt, row) {
    var idx, len = children.length, plan = row.plan, child, childSize, spacing,
        items = [], itemOffset = 0, isVertical = plan.isVertical, itemSize, itemLength,
        maxSpacerLength,
        canWrap = this.get('canWrap'),
        newRowPending = NO,
        maxItemLength = 0,
        max = row.plan.maximumRowLength;

    for (idx = startingAt; idx < len; idx++) {
      child = children[idx];

      // this must be set before we check if the child is included because even
      // if it isn't included, we need to remember that there is a line break
      // for later
      newRowPending = newRowPending || (items.length > 0 && child.get('startsNewRow'));

      if (!this.shouldIncludeChildInFlow(idx, child)) continue;

      childSize = this.flowSizeForChild(idx, child);
      spacing = this.flowSpacingForChild(idx, child);

      childSize.width += spacing.left + spacing.right;
      childSize.height += spacing.top + spacing.bottom;

      itemLength = childSize[isVertical ? 'height' : 'width'];
      if(!SC.none(childSize.maxSpacerLength)) maxSpacerLength = childSize.maxSpacerLength + (isVertical ? spacing.top + spacing.bottom : spacing.left + spacing.right);
      itemSize = childSize[isVertical ? 'width' : 'height'];

      // there are two cases where we must start a new row: if the child or a
      // previous child in the row that wasn't included has
      // startsNewRow === YES, and if the item cannot fit. Neither applies if there
      // is nothing in the row yet.
      if ((newRowPending || (canWrap && itemOffset + itemLength > max)) && items.length > 0) {
        break;
      }

      var item = {
        child: child,

        itemLength: itemLength,
        maxSpacerLength: maxSpacerLength,
        itemSize: itemSize,

        spacing: spacing,

        // The position in the row.
        //
        // note: in one process or another, this becomes left or top.
        // but before that, it is calculated.
        position: undefined,

        // whether this item should attempt to fill to the row's size
        fillRow: isVertical ? child.get('fillWidth') : child.get('fillHeight'),

        // whether this item is a spacer, and thus should be resized to its itemLength
        isSpacer: child.get('isSpacer'),

        // these will get set if necessary during the positioning code
        left: undefined, top: undefined,
        width: undefined, height: undefined
      };


      items.push(item);
      itemOffset += itemLength;
      maxItemLength = Math.max(itemLength, maxItemLength);
    }

    row.rowLength = itemOffset;

    // if the row cannot wrap, then the minimum size for the row (and therefore collapsed size)
    // is the same as the current row length: it consists of the minimum size of all items.
    //
    // If the row can wrap, then the longest item will determine the size of a fully
    // collapsed (one item per row) layout.
    var minRowLength = canWrap ? maxItemLength : row.rowLength;
    row.plan.maximumCollapsedRowLength = Math.max(minRowLength, row.plan.maximumCollapsedRowLength);
    row.items = items;
    return idx;
  },

  /** @private */
  _scfl_positionChildrenInRows: function(plan) {
    var rows = plan.rows, len = rows.length, idx;

    for (idx = 0; idx < len; idx++) {
      this._scfl_positionChildrenInRow(rows[idx]);
    }
  },

  /**
    @private
    Positions items within a row. The items are already in the row, this just
    modifies the 'position' property.

    This also marks a tentative size of the row, and whether it should be expanded
    to fit in any available extra space. Note the term 'size' rather than 'length'...
  */
  _scfl_positionChildrenInRow: function(row) {
    var items = row.items, len = items.length, idx, item, position, rowSize = 0,
        spacerCount = 0, spacerSize, align = row.plan.align, shouldExpand = YES,
        leftOver = 0, noMaxWidth = NO;

    //
    // STEP ONE: DETERMINE SPACER SIZE + COUNT
    //
    for (idx = 0; idx < len; idx++) {
      item = items[idx];
      if (item.isSpacer) {
        spacerCount += item.child.get('spaceUnits') || 1;
      }
    }

    // justification is like adding a spacer between every item. We'll actually account for
    // that later, but for now...
    if (align === SC.ALIGN_JUSTIFY) spacerCount += len - 1;

    // calculate spacer size
    spacerSize = Math.max(0, row.plan.maximumRowLength - row.rowLength) / spacerCount;

    // determine individual spacer sizes using spacerSize and limited by
    // each spacer's maxWidth (if they have one)
    while(spacerSize > 0) {
      for (idx = 0; idx < len; idx++) {
        item = items[idx];

        if (item.isSpacer) {
          item.itemLength += spacerSize * (item.child.get('spaceUnits') || 1);
          if(item.itemLength > item.maxSpacerLength) {
            leftOver +=  item.itemLength - item.maxSpacerLength;
            item.itemLength = item.maxSpacerLength;
          }
          else {
            noMaxWidth = YES;
          }
        }
      }

      // if none of the spacers can expand further, stop
      if(!noMaxWidth) break;

      spacerSize = Math.round(leftOver / spacerCount);
      leftOver = 0;
    }

    //
    // STEP TWO: ADJUST FOR ALIGNMENT
    // Note: if there are spacers, this has no effect, because they fill all available
    // space.
    //
    position = 0;
    if (spacerCount === 0 && (align === SC.ALIGN_RIGHT || align === SC.ALIGN_BOTTOM)) {
      position = row.plan.maximumRowLength - row.rowLength;
    } else if (spacerCount === 0 && (align === SC.ALIGN_CENTER || align === SC.ALIGN_MIDDLE)) {
      position = (row.plan.maximumRowLength / 2) - (row.rowLength / 2);
    }

    position += row.plan.rowStartPadding;
    //
    // STEP TWO: LOOP + POSITION
    //
    for (idx = 0; idx < len; idx++) {
      item = items[idx];

      // if this item has fillWidth or fillHeight set, the row should expand
      // laterally
      if(!item.fillRow) shouldExpand = NO;

      // if the item is not a fill-row item, this row has a size that all fill-row
      // items should expand to
      rowSize = Math.max(item.itemSize, rowSize);

      item.position = position;

      position += item.itemLength;

      // if justification is on, we have one more spacer
      // note that we check idx because position is used to determine the new rowLength.
      if (align === SC.ALIGN_JUSTIFY && idx < len - 1) position += spacerSize;
    }

    row.shouldExpand = len > 0 ? shouldExpand : NO;
    row.rowLength = position - row.plan.rowStartPadding; // row length does not include padding
    row.rowSize = rowSize;

    row.plan.totalCollapsedRowSize += row.rowSize;

  },

  /** @private */
  _scfl_positionRows: function(plan) {
    var rows = plan.rows, len = rows.length, idx, row, position,
        fillRowCount = 0, planSize = 0, fillSpace;

    // first, we need a count of rows that need to fill, and the size they
    // are filling to (the combined size of all _other_ rows).
    for (idx = 0; idx < len; idx++) {
      if (rows[idx].shouldExpand) fillRowCount++;
      planSize += rows[idx].rowSize;
    }

    fillSpace = plan.fitToPlanSize - planSize;

    // now, position+size the rows
    position = plan.planStartPadding;
    for (idx = 0; idx < len; idx++) {
      row = rows[idx];

      if (row.shouldExpand && fillSpace > 0) {
        row.rowSize += fillSpace / fillRowCount;
        fillRowCount--;
      }

      row.position = position;
      position += row.rowSize;
    }
  },

  /**
    @private
    Positions all of the child views according to the plan.
  */
  _scfl_applyPlan: function(plan) {
    var rows = plan.rows, rowIdx, rowsLen, row, longestRow = 0, totalSize = 0,
        items, itemIdx, itemsLen, item, layout, itemSize,

        isVertical = plan.isVertical;

    rowsLen = rows.length;
    for (rowIdx = 0; rowIdx < rowsLen; rowIdx++) {
      row = rows[rowIdx];
      longestRow = Math.max(longestRow, row.rowLength);
      totalSize += row.rowSize;

      items = row.items; itemsLen = items.length;

      for (itemIdx = 0; itemIdx < itemsLen; itemIdx++) {
        item = items[itemIdx];
        item.child.beginPropertyChanges();

        itemSize = item.fillRow ? row.rowSize : item.itemSize;

        layout = {
          left: item.spacing.left + (isVertical ? row.position : item.position),
          top: item.spacing.top + (isVertical ? item.position : row.position),
          width: isVertical ? itemSize : item.itemLength,
          height: isVertical ? item.itemLength : itemSize
        };

        layout.width -= item.spacing.left + item.spacing.right;
        layout.height -= item.spacing.top + item.spacing.bottom;

        this.applyPlanToView(item.child, layout);
        item.child._scfl_lastLayout = layout;

        item.child.endPropertyChanges();
      }
    }

    totalSize += plan.planStartPadding + plan.planEndPadding;
    longestRow += plan.rowStartPadding + plan.rowEndPadding;

    this.beginPropertyChanges();

    this.set('calculatedHeight', isVertical ? longestRow : totalSize);
    this.set('calculatedWidth', isVertical ? totalSize : longestRow);
    this.set('_scfl_maximumCollapsedRowLength', plan.maximumCollapsedRowLength);
    this.set('_scfl_totalCollapsedRowSize', plan.totalCollapsedRowSize);

    this.endPropertyChanges();
  },

  /**
    Applies the given layout to the view.
    Override this if you would like your view to, for example, animate to a new position.
  */
  applyPlanToView: function(view, layout) {
    view.adjust(layout);
  },

  /** @private */
  _scfl_tileOnce: function() {
    this.invokeLast(this._scfl_tile);
  },

  _scfl_tile: function() {
    // short circuit when hidden
    if(!this.get('isVisibleInWindow')) return;

    // first, do the plan
    var plan = this._scfl_createPlan();
    this._scfl_distributeChildrenIntoRows(plan);
    this._scfl_positionChildrenInRows(plan);
    this._scfl_positionRows(plan);
    this._scfl_applyPlan(plan);

    // save so it can be observed
    this.setIfChanged('numberOfRows', plan.rows.length);

    // second, observe all children, and stop observing any children we no longer
    // should be observing.
    var previouslyObserving = this._scfl_isObserving || SC.CoreSet.create(),
        nowObserving = SC.CoreSet.create();

    var children = this.get('childViews'), len = children.length, idx, child;
    for (idx = 0; idx < len; idx++) {
      child = children[idx];

      if (!previouslyObserving.contains(child)) {
        this.observeChildLayout(child);
      } else {
        previouslyObserving.remove(child);
      }

      nowObserving.add(child);
    }

    len = previouslyObserving.length;
    for (idx = 0; idx < len; idx++) {
      this.unobserveChildLayout(previouslyObserving[idx]);
    }
  },

  /** @private */
  _scfl_frameDidChange: function() {
    var frame = this.get("frame"), lf = this._scfl_lastFrameSize || {};
    this._scfl_lastFrameSize = SC.clone(frame);

    if (lf.width == frame.width && lf.height == frame.height) {
      return;
    }

    this._scfl_tileOnce();
  }.observes('frame'),

  /** @private */
  destroyMixin: function() {
    var isObserving = this._scfl_isObserving;
    if (!isObserving) return;

    var len = isObserving.length, idx;
    for (idx = 0; idx < len; idx++) {
      this.unobserveChildLayout(isObserving[idx]);
    }
  },

  /** @private
    Reorders childViews so that the passed views are at the beginning in the order they are passed. Needed because childViews are laid out in the order they appear in childViews.
  */
  reorder: function(views) {
    if(!SC.typeOf(views) === SC.T_ARRAY) views = arguments;

    var i = views.length, childViews = this.childViews, view;

    // childViews.[] should be observed
    this.beginPropertyChanges();

    while(i-- > 0) {
      view = views[i];

      if(SC.typeOf(view) === SC.T_STRING) view = this.get(view);

      childViews.removeObject(view);
      childViews.unshiftObject(view);
    }

    this.endPropertyChanges();

    this._scfl_childViewsDidChange();

    return this;
  }
};


/* >>>>>>>>>> BEGIN source/mixins/gesturable.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/**
  @namespace
  
  You can mix in SC.Gesturable to your views to add some support for recognizing
  gestures.
  
  SproutCore views have built-in touch events. However, sometimes you may want
  to recognize gestures like tap, pinch, swipe, etc. This becomes tedious if you
  need to do this often, and more so if you need to check for multiple possible
  gestures on the same view.
  
  SC.Gesturable allows you to define a collection of gestures (SC.Gesture objects)
  that your view should recognize. When a gesture is recognized, methods will be
  called on the view:
  
    - [gestureName](gesture, args...): called when the gesture has occurred. This is 
      useful for event-style gestures, where you aren't interested in when it starts or
      ends, but just that it has occurred. SC.SwipeGesture triggers this after the
      swipe has moved a minimum amount—40px by default.
    - [gestureName]Start(gesture, args...): called when the gesture is first recognized. 
      For instance, a swipe gesture may be recognized after the finger has moved a 
      minimum distance in a horizontal.
    - [gestureName]Changed(gesture, args...): called when some property of the gesture 
      has changed. For instance, this may be called continuously as the user swipes as 
      the swipe's distance changes.
    - [gestureName]Cancelled(gesture, args...): called when a gesture, for one reason 
      or another, is no longer recognized. For instance, a horizontal swipe gesture 
      could cancel if the user moves too far in a vertical direction.
    - [gestureName]End(gesture, args...): called when a gesture ends. A swipe would end
      when the user lifts their finger.
  
  Each of these methods is passed the gesture instance, in addition to any arguments
  the gesture sends for your convenience. The default swipe gesture sends an SC.Touch
  instance, the swipe direction, and the distance the swipe has moved in that direction.
  
  Using SC.Gesturable
  -------------------
  
  To make your view recognize gestures, mix in Gesturable and add items to the 'gestures'
  property:
  
      SC.View.extend(SC.Gesturable, {
        gestures: [SC.PinchGesture, 'mySwipeGesture'],
        
        // specifying as a string allows you to configure it:
        mySwipeGesture: SC.SwipeGesture.extend({
          direction: SC.SWIPE_VERTICAL,
          startDistance: 3,
          swipeDistance: 20
        }),
        
        // handle the swipe action
        swipe: function(touch, direction) {
          console.error("Swiped! In direction: " + direction);
        },
        
        swipeStart: function(touch, direction, delta) {
          console.error("Swipe started in direction: " + direction + "; dist: " + delta);
        },
        
        swipeChanged: function(touch, direction, delta) {
          console.error("Swipe continued in direction: " + direction + "; dist: " + delta);
        },
        
        swipeEnd: function(touch, direction, delta) {
          console.error("Completed swipe in direction: " + direction + "; dist: " + delta);
        }
        
      })
  
*/
SC.Gesturable = {

  concatenatedProperties: ["gestures"],
  gestures: [],
  
  /**
    @private
    When SC.Gesturable initializes, any gestures on the view must be instantiated.
  */
  initMixin: function() {
    this.createGestures();
  },
  
  /**
    @private
    Instantiates the gestures.
  */
  createGestures: function() {
    var gestures = this.get("gestures"), idx, len = gestures.length, g, _g = [];

    // loop through all gestures
    for (idx = 0; idx < len; idx++) {
      // get the proper gesture
      if (SC.typeOf(gestures[idx]) === SC.T_STRING) {
        g = this.get(gestures[idx]);
      } else {
        g = gestures[idx];
      }
      
      // if it was not found, well, that's an error.
      if (!g) {
        throw new Error("Could not find gesture named '" + gestures[idx] + "' on view.");
      }
      
      // if it is a class, instantiate (it really ought to be a class...)
      if (g.isClass) {
        g = g.create({
          view: this
        });
      }
      
      // and set the gesture instance and add it to the array.
      if (SC.typeOf(gestures[idx]) === SC.T_STRING) this[gestures[idx]] = g;
      _g.push(g);
    }
    
    this.set("gestures", _g);
  },
  
  /**
    Handles touch start by handing it to the gesture recognizing code.
    
    If you override touchStart, you will need to call gestureTouchStart to
    give the gesture system control of the touch. You will continue to get
    events until if and when a gesture decides to take "possession" of a touch—
    at this point, you will get a [gestureName]Start event.
    
    You do not have to call gestureTouchStart immediately; you can call it
    at any time. This allows you to avoid passing control until _after_ you
    have determined your own touchStart, touchesDragged, and touchEnd methods
    are not going to handle it.
  */
  touchStart: function(touch) {
    this.gestureTouchStart(touch);
  },
  
  /**
    Tells the gesture recognizing code about touches moving.
    
    If you override touchesDragged, you will need to call gestureTouchesDragged
    (at least for any touches you called gestureTouchStart for in touchStart) to 
    allow the gesture system to update.
  */
  touchesDragged: function(evt, touches) {
    this.gestureTouchesDragged(evt, touches);
  },
  
  /**
    Tells the gesture recognizing code about a touch ending.
    
    If you override touchEnd, you will need to call gestureTouchEnd
    for any touches you called touchStart for.
  */
  touchEnd: function(touch) {
    this.gestureTouchEnd(touch);
  },
  
  /**
    Tells the gesture recognizing system about a new touch.
    
    This informs all gestures that a new touch, "unassigned" to any gesture,
    has been located. Later, each gesture has an opportunity to claim the touch.
    
    Once they have claimed the touch, further events will go _directly_ to them—
    this view will cease receiving the touchesDragged and will not receive a touchEnd.
  */
  gestureTouchStart: function(touch) {
    touch.isInteresting = 0;
    
    var gestures = this.get("gestures"), idx, len = gestures.length, g;
    for (idx = 0; idx < len; idx++) {
      g = gestures[idx];
      g.unassignedTouchDidStart(touch);
    }
  },
  
  /**
    Tells the gesture recognition system that some touches have moved.
    
    This informs all gestures that these touches have changed. All such touches
    are "unassigned" because all "assigned" touches already get sent directly
    to the gesture.
  */
  gestureTouchesDragged: function(evt, touches) {
    var gestures = this.get("gestures"), idx, len = gestures.length, g;
    for (idx = 0; idx < len; idx++) {
      g = gestures[idx];
      g.unassignedTouchesDidChange(evt, touches);
    }
  },
  
  /**
    Tells the gesture recognition system that a touch have ended.
    
    This informs all of the gestures that the touch ended. The touch is
    an unassigned touch as, if it were assigned to a gesture, it would have
    been sent directly to the gesture, bypassing this view.
  */
  gestureTouchEnd: function(touch) {
    var gestures = this.get("gestures"), idx, len = gestures.length, g;
    for (idx = 0; idx < len; idx++) {
      g = gestures[idx];
      g.unassignedTouchDidEnd(touch);
    }
  }
};
/* >>>>>>>>>> BEGIN source/mixins/inline_editable.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/**
  @namespace

  This mixin is used for views that show a seperate editor view to edit.
  For example, the default behavior of SC.LabelView if isEditable is set
  to YES is to popup an SC.InlineTextFieldView when double clicked. This is a
  seperate text input that will handle the editing and save its value back to
  the label when it is finished.

  To use this functionality, all you have to do is apply this mixin to
  your view. You may define your own SC.InlineEditorDelegate to further
  customize editing behavior.

      MyProject.MyView = SC.View.extend(SC.InlineEditable, {
        inlineEditorDelegate: myDelegate
      });

  The delegate methods will default to your view unless the
  inlineEditorDelegate implements them. Simple views do not require a
  seperate delegate. If your view has a more complicated editing
  interaction, you may also implement a custom delegate. For example, if
  you have a form with several views that all edit together, you might
  set the parent view as the delegate so it can manage the lifecycle and
  layout of the editors.

  See SC.InlineEditorDelegate for more information on using a delegate to
  customize your view's edit behavior.

  Your view can now be edited by calling beginEditing() on it.

      myView.beginEditing();

  This will create an editor for the view. You can then end the editing process
  by calling commitEditing() or discardEditing() on either the view or the
  editor. commitEditing() will save the value and discard will revert to the
  original value.

      myView.commitEditing();
      myView.discardEditing();

  Note that the editor is a private property of the view, so the only views that
  should be able to access the methods on it are the editor itself, the view it
  is editing, and their delegates.
*/
SC.InlineEditable = {

  /**
    Walk like a duck.

    @type Boolean
    @default YES
  */
  isInlineEditable: YES,

  /**
    Flag to enable or disable editing.

    @type Boolean
    @default YES
  */
  isEditable: YES,

  /**
    The view that will be used to edit this view. Defaults to
    SC.InlineTextFieldView, which is simply a text field that positions itself
    over the view being edited.

    @type SC.InlineEditor
    @default SC.InlineTextFieldView
  */
  exampleEditor: SC.InlineTextFieldView,

  /**
    Indicates whether the view is currently editing. Attempting to
    beginEditing a view that is already editing will fail.

    @type Boolean
    @default NO
  */
  isEditing: NO,

  /**
    Delegate that will be notified of events related to the editing
    process. Also responsible for managing the lifecycle of the editor.

    @type SC.InlineEditorDelegate
    @default SC.InlineTextFieldDelegate
  */
  inlineEditorDelegate: SC.InlineTextFieldDelegate,

  /**
    @private
    The editor responsible for editing this view.
  */
  _editor: null,

  /**
    Tells the view to start editing. This will create an editor for it
    and transfer control to the editor.

    Will fail if the delegate returns NO to inlineEditorShouldBeginEditing.

    @returns {Boolean} whether the view successfully entered edit mode
  */
  beginEditing: function() {
    var del;

    del = this.delegateFor('inlineEditorShouldBeginEditing', this.inlineEditorDelegate);
    if(del && !del.inlineEditorShouldBeginEditing(this, this.get('value'))) return NO;

    this._editor = this.invokeDelegateMethod(this.inlineEditorDelegate, 'acquireEditor', this);

    if(this._editor) return this._editor.beginEditing(this);
    else return NO;
  },

  /**
    Tells the view to save the value currently in the editor and finish
    editing. The delegate will be consulted first by calling
    inlineEditorShouldCommitEditing, and the operation will not be
    allowed if the delegate returns NO.

    Will fail if the delegate returns NO to inlineEditorShouldCommitEditing.

    @returns {Boolean} whether the delegate allowed the value to be committed
  */
  commitEditing: function() {
    return this._editor ? this._editor.commitEditing() : NO;
  },

  /**
    Tells the view to leave edit mode and revert to the value it had
    before editing. May fail if the delegate returns NO to
    inlineEditorShouldDiscardEditing. It is possible for the delegate to
    return false to inlineEditorShouldDiscardEditing but true to
    inlineEditorShouldCommitEditing, so a client view may attempt to
    call commitEditing in case discardEditing fails.

    Will fail if the delegate returns NO to inlineEditorShouldDiscardEditing.

    @returns {Boolean} whether the delegate allowed the view to discard its value
  */
  discardEditing: function() {
    return this._editor ? this._editor.discardEditing() : NO;
  },

  /**
    Allows the view to begin editing if it is editable and it is not
    already editing.

    @returns {Boolean} if the view is allowed to begin editing
  */
  inlineEditorShouldBeginEditing: function() {
    return !this.get('isEditing') && this.get('isEditable');
  },

  // TODO: implement validator
  /**
    By default, the editor starts with the value of the view being edited.

    @params {SC.InlineEditable} editor the view being edited
    @params {SC.InlineEditor} value the editor for the view
    @params {Object} editable the initial value of the editor
  */
  inlineEditorWillBeginEditing: function(editor, value, editable) {
    editor.set('value', this.get('value'));
  },

  /**
    Sets isEditing to YES once editing has begun.

    @params {SC.InlineEditable} the view being edited
    @params {SC.InlineEditor} the editor for the view
    @params {Object} the initial value of the editor
  */
  inlineEditorDidBeginEditing: function(editor, value, editable) {
    this.set('isEditing', YES);
  },

  /** @private
    Calls inlineEditorWillEndEditing for backwards compatibility.

    @params {SC.InlineEditable} the view being edited
    @params {SC.InlineEditor} the editor for the view
    @params {Object} the initial value of the editor
  */
  inlineEditorWillCommitEditing: function(editor, value, editable) {
    if(this.inlineEditorWillEndEditing) this.inlineEditorWillEndEditing(editor, value);
  },

  /**
    By default, commiting editing simply sets the value that the editor
    returned and cleans up.

    @params {SC.InlineEditable} the view being edited
    @params {SC.InlineEditor} the editor for the view
    @params {Object} the initial value of the editor
  */
  inlineEditorDidCommitEditing: function(editor, value, editable) {
    editable.setIfChanged('value', value);

    if(this.inlineEditorDidEndEditing) this.inlineEditorDidEndEditing(editor, value);

    this._endEditing();
  },

  /**
    Calls inlineEditorWillEndEditing for backwards compatibility.

    @params {SC.InlineEditable} the view being edited
    @params {SC.InlineEditor} the editor for the view
    @params {Object} the initial value of the editor
  */
  inlineEditorWillDiscardEditing: function(editor, editable) {
    if(this.inlineEditorWillEndEditing) this.inlineEditorWillEndEditing(editor, this.get('value'));
  },

  /**
    Calls inlineEditorDidEndEditing for backwards compatibility and then
    cleans up.

    @params {SC.InlineEditable} the view being edited
    @params {SC.InlineEditor} the editor for the view
    @params {Object} the initial value of the editor
  */
  inlineEditorDidDiscardEditing: function(editor, editable) {
    if(this.inlineEditorDidEndEditing) this.inlineEditorDidEndEditing(editor, this.get('value'));

    this._endEditing();
  },

  /**
    @private
    Shared code used to cleanup editing after both discarding and commiting.
  */
  _endEditing: function() {
    // _editor may be null if we were called using the
    // SC.InlineTextFieldView class methods
    if(this._editor) {
      this.invokeDelegateMethod(this.inlineEditorDelegate, 'releaseEditor', this._editor);
      this._editor = null;
    }

    this.set('isEditing', NO);
  }
};


/* >>>>>>>>>> BEGIN source/mixins/inline_editor.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2010 Sprout Systems, Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/**
  @namespace

  This mixin is for a view that is editable but is acting as a proxy to
  edit another view. For example, a calendar picker that pops up over
  top of a date display.

  Instantiation and destruction will be handled by the InlineEditorDelegate
  defined on the InlineEditable view.

  Any runtime configuration should be handled by the delegate's
  inlineEditorWillBeginEditing method. This will be done at the start of the
  beginEditing function, so your view should be able to handle having value
  changed by this method.

  Your view should also be sure to cleanup completely when editing is finished,
  because the delegate may decide to reuse the same editor elsewhere.

  See SC.InlineTextFieldView for an example of an implementation of
  SC.InlineEditor.
*/
SC.InlineEditor = {

  /**
    Walk like a duck.

    @type Boolean
    @default YES
    @readOnly
  */
  isInlineEditor: YES,

  /**
    Indicates the view is currently editing. For a typical editor, this
    will always be true as long as the view exists, but some
    InlineEditorDelegates may have more complex lifecycles in which
    editors are reused.

    @type Boolean
    @default NO
  */
  isEditing: NO,

  /**
    The delegate responsible for the editors lifecycle as well as the
    target for notifications. This property should be set when the
    delegate creates the editor and does not need to be in the view
    definition.

    @type SC.InlineEditorDelegate
    @default null
  */
  inlineEditorDelegate: null,

  /**
    @private
    The view that this view is responsible for editing.
    @type SC.InlineEditable
  */
  _target: null,

  /**
    Tells the editor to begin editing another view with the given starting value.
    Editors may be reused so make sure that the editor is fully cleaned
    up and reinitialized.

    Sets isEditing to YES.

    Will fail if the editor is already editing.

    If you override this method, be sure to call arguments.callee.base.apply(this,arguments) at the beginning of
    you function so that the delegate will be able to configure the view when it
    is notified of the inlineEditorWillBeginEditing event.

    @param {SC.View} editable the view being edited
    @returns {Boolean} whether the editor was able to successfully begin editing
  */
  beginEditing:function(editable) {
    if(this.get('isEditing') || !editable || !editable.isInlineEditable) return NO;

    var del, target;

    target = this._target = editable;

    del = this.delegateFor('inlineEditorWillBeginEditing', this.inlineEditorDelegate, target);
    if(del) del.inlineEditorWillBeginEditing(this, this.get('value'), target);

    this.set('isEditing', YES);

    // needs to be invoked last because it needs to run after the view becomes
    // first responder
    this.invokeLast(this._callDidBegin);

    // remember that we invoked in case commit gets called before the invoke
    // goes off
    this._didBeginInvoked = YES;

    return YES;
  },

  /**
    @private
    Notifies the delegate of the didBeginEditing event. Needs to be invoked last
    because becoming first responder doesn't happen until the end of the runLoop
    and didBegin is supposed to occur after the editor becomes first responder.
  */
  _callDidBegin: function() {
    // don't notify if we already ended editing
    if(!this.get('isEditing')) return NO;

    this._didBeginInvoked = NO;

    var target = this._target, del;

    del = this.delegateFor('inlineEditorDidBeginEditing', this.inlineEditorDelegate, target);
    if(del) del.inlineEditorDidBeginEditing(this, this.get('value'), target);
  },

  /**
    Tells the editor to save its value back to its target view and end
    editing. Since the editor is a private property of the view it is
    editing for, this function should only be called from the editor
    itself. For example, you may want your editor to handle the enter
    key by calling commitEditing on itself.

    Will fail if the editor is not editing or if the delegate returns NO to
    inlineEditorShouldCommitEditing.

    @returns {Boolean} whether the editor was allowed to successfully commit its value
  */
  commitEditing:function() {
    if(!this.get('isEditing')) return NO;

    // if the handler was invoked but never went off, call it now
    if(this._didBeginInvoked) this._callDidBegin();

    var del, target = this._target;

    del = this.delegateFor('inlineEditorShouldCommitEditing', this.inlineEditorDelegate, target);
    if(del && !del.inlineEditorShouldCommitEditing(this, this.get('value'), target)) return NO;

    del = this.delegateFor('inlineEditorWillCommitEditing', this.inlineEditorDelegate, target);
    if(del) del.inlineEditorWillCommitEditing(this, this.get('value'), target);

    this._endEditing();

    del = this.delegateFor('inlineEditorDidCommitEditing', this.inlineEditorDelegate, target);
    if(del) del.inlineEditorDidCommitEditing(this, this.get('value'), target);

    return YES;
  },

  /**
    Tells the editor to discard its value and end editing. Like
    commitEditing, this should only be called by other methods of the
    editor. For example, the handle for the escape key might call
    discardEditing.

    Will fail if the editor is not editing or if the delegate returns NO to
    inlineEditorShouldDiscardEditing.

    @returns {Boolean} whether the editor was allowed to discard its value
  */
  discardEditing:function() {
    if(!this.get('isEditing')) return NO;

    // if the handler was invoked but never went off, call it now
    if(this._didBeginInvoked) this._callDidBegin();

    var del, target = this._target;

    del = this.delegateFor('inlineEditorShouldDiscardEditing', this.inlineEditorDelegate, target);
    if(del && !del.inlineEditorShouldDiscardEditing(this, target)) return NO;

    del = this.delegateFor('inlineEditorWillDiscardEditing', this.inlineEditorDelegate, target);
    if(del) del.inlineEditorWillDiscardEditing(this, target);

    this._endEditing();

    del = this.delegateFor('inlineEditorDidDiscardEditing', this.inlineEditorDelegate, target);
    if(del) del.inlineEditorDidDiscardEditing(this, target);

    return YES;
  },

  /**
    @private
    Performs the cleanup functionality shared between discardEditing and
    commitEditing.
  */
  _endEditing: function() {
    this.set('isEditing', NO);
    this._target = null;
  }

};

/* >>>>>>>>>> BEGIN source/mixins/inline_editor_delegate.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/**
  @namespace
  
  This delegate is consulted by view implementing SC.InlineEditable and
  SC.InlineEditor and controls the lifecycle of the editor as well as begin
  notified of events in the editing process.
  
  By default it edits an SC.LabelView using an SC.InlineTextFieldView.

  All methods will be attempted to be called on the inlineEditorDelegate of the
  inlineEditor or inlineEditable first and then the target view if it didn't exist
  on the delegate. This allows you to implement default delegate handlers on your
  editable view.
  
  @since SproutCore 1.0
*/
SC.InlineEditorDelegate = {

  // ..........................................................
  // Required Functions
  // 

  /**
    Acquires an editor for the view. This may simply create one and return it,
    or you may implement more complex lifecycle management like pooling of
    editors.

    May return null if for some reason an editor could not be required.

    You must override this function.

    @params {SC.InlineEditable} editable the view that is begin edited
    @returns {SC.InlineEditor} an editor for the view
  */
  acquireEditor:function(editable) {},

  /**
    Releases an editor. This may simply remove it from its parent and dispose of
    it, or you may implement more complex lifecycle management like pooling of
    editors.

    You must override this function.

    @params {SC.InlineEditor} editor the editor being released
    @returns {Boolean} YES if it was successfully released
  */
  releaseEditor:function(editor) {},


  // ..........................................................
  // Optional Functions
  // 

  /**
    Determines if the view should be allowed to begin editing and returns YES if
    so. Isn't passed the editor because it hasn't been created yet. If this
    method is not defined the editor will assume it is always allowed to begin
    editing.

    @params {SC.InlineEditable} editable the view that is attempting to begin editing
    @params {Object} value the current value of the view
    @returns {Boolean} YES if the view is allowed to edit
  */
  inlineEditorShouldBeginEditing: function(editable, value) {},

  /**
    Notifies the delegate that the view was allowed to begin editing and the
    editor has been acquired, but hasn't actually done any setup. Most views will
    set their current value as the starting value of the editor here, and
    depending on the editor other configuration options may be available.

    Since the editor's value hasn't been configured with, the value passed here will be
    the default value of the editor.

    @params {SC.InlineEditable} the view being edited
    @params {SC.InlineEditor} the editor for the view
    @params {Object} the value the editor will start with
  */
  inlineEditorWillBeginEditing:function(editor, value, editable) {},

  /**
    Notifies the delegate that the editor has finished setting up itself and is
    now editing.

    @params {SC.InlineEditable} the view being edited
    @params {SC.InlineEditor} the editor for the view
    @params {Object} the value the editor started with
  */
  inlineEditorDidBeginEditing:function(editor, value, editable) {},

  /**
    Determines if the editor is allowed to end editing and store its value back
    to the view being edited. If this method is not defined the editor will
    assume it is always allowed to commit.

    @params {SC.InlineEditable} the view being edited
    @params {SC.InlineEditor} the editor for the view
    @params {Object} the value the editor is attempting to commit
  */
  inlineEditorShouldCommitEditing:function(editor, value, editable) {},

  /**
    Notifies the delegate that the editor was allowed to commit and is going to
    commit but hasn't actually performed any cleanup yet.

    @params {SC.InlineEditable} the view being edited
    @params {SC.InlineEditor} the editor for the view
    @params {Object} the value the editor ended with
  */
  inlineEditorWillCommitEditing:function(editor, value, editable) {},

  /**
    Notifies the delegate that the editor was allowed to commit and finished
    performing any cleanup necessary. This is where you should save the final
    value back to your view after performing any necessary transforms to it.

    @params {SC.InlineEditable} the view being edited
    @params {SC.InlineEditor} the editor for the view
    @params {Object} the value the editor ended with
  */
  inlineEditorDidCommitEditing:function(editor, value, editable) {},

  /**
    Determines if the editor is allowed to discard its current value and end
    editing. If this method is undefined the editor will assume it is always
    allowed to discard.

    @params {SC.InlineEditable} the view being edited
    @params {SC.InlineEditor} the editor for the view
  */
  inlineEditorShouldDiscardEditing:function(editor, editable) {},

  /**
    Notifies the delegate that the view was allowed to discard editing but
    hasn't performed any cleanup yet.

    @params {SC.InlineEditable} the view being edited
    @params {SC.InlineEditor} the editor for the view
  */
  inlineEditorWillDiscardEditing:function(editor, editable) {},

  /**
    Notifies the delegate that the editor has finished cleaning up after
    discarding editing.

    @params {SC.InlineEditable} the view being edited
    @params {SC.InlineEditor} the editor for the view
  */
  inlineEditorDidDiscardEditing:function(editor, editable) {},


  // ..........................................................
  // Backwards Compatibility
  // 

  /**
    @private

    Notifies the delegate that the editor will end editing but hasn't cleaned up
    yet. This can be caused by both commit or discard. If it was a discard, the
    value will be the same as the current value of the editable view. Otherwise,
    it was a commit and the value will be the value of the editor.

    This method is for backwards compatibility and should not be used.

    @params {SC.InlineEditable} the view being edited
    @params {SC.InlineEditor} the editor for the view
    @params {Object} the final value of the edit
  */
  inlineEditorWillEndEditing: function(editor, value, editable) {},

  /**
    @private

    Notifies the delegate that the editor has cleaned up after editing. This can
    be caused by both commit or discard. If it was a discard, the value will be
    the same as the current value of the editable view. Otherwise, it was a
    commit and the value will be the value of the editor.

    This method is for backwards compatibility and should not be used.

    @params {SC.InlineEditable} the view being edited
    @params {SC.InlineEditor} the editor for the view
    @params {Object} the final value of the edit
  */
  inlineEditorDidEndEditing: function(editor, value, editable) {}
};


/* >>>>>>>>>> BEGIN source/mixins/inner_frame.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/**
  @type String
  @constant
*/
SC.SCALE_NONE = "none";

/**
  Stretch/shrink the shape to fill the frame

  @type String
  @constant
*/
SC.FILL = "fill";

/**
  Stretch/shrink the shape to fill the frame while maintaining aspect ratio, such
  that the shortest dimension will just fit within the frame and the longest dimension will
  overflow and be cropped.

  @type String
  @constant
*/
SC.FILL_PROPORTIONALLY = SC.BEST_FILL = "best-fill";

/**
  Stretch/shrink the shape to fit the frame while maintaining aspect ratio, such that the
  longest dimension will just fit within the frame

  @type String
  @constant
*/
SC.BEST_FIT = "best-fit";

/**
  Shrink the shape to fit the frame while maintaining aspect ratio, such that
  the longest dimension will just fit within the frame.  Do not stretch the shape if the shape's
  width is less than the frame's width.

  @type String
  @constant
*/
SC.BEST_FIT_DOWN_ONLY = "best-fit-down";

/**
  @namespace

  InnerFrame provides the innerFrameForSize function, which will return a frame for the given size adjusted
  to fit within the given outer size, according to the align and scale properties.

  View's that render images will find this mixin particularly useful for fitting their images.
 */
SC.InnerFrame = {

  /**
    Align the shape within its frame. Possible values:

      - SC.ALIGN_TOP_LEFT
      - SC.ALIGN_TOP
      - SC.ALIGN_TOP_RIGHT
      - SC.ALIGN_LEFT
      - SC.ALIGN_CENTER
      - SC.ALIGN_RIGHT
      - SC.ALIGN_BOTTOM_LEFT
      - SC.ALIGN_BOTTOM
      - SC.ALIGN_BOTTOM_RIGHT

    @type String
    @default SC.ALIGN_CENTER
  */
  align: SC.ALIGN_CENTER,

  /**
    Returns a frame (x, y, width, height) fitting the source size (sourceWidth & sourceHeight) within the
    destination size (destWidth & destHeight) according to the align and scale properties.  This is essential to
    positioning child views or elements within parent views or elements in elegant ways.

    @param {Number} sourceWidth
    @param {Number} sourceHeight
    @param {Number} destWidth
    @param {Number} destHeight
    @returns {Object} the inner frame with properties: {x: value, y: value, width: value, height: value }
  */
  innerFrameForSize: function(sourceWidth, sourceHeight, destWidth, destHeight) {
    var align = this.get('align'),
        scale = this.get('scale'),
        scaleX,
        scaleY,
        result;

    // Fast path
    result = { x: 0, y: 0, width: destWidth, height: destHeight };
    if (scale === SC.FILL) return result;

    // Determine the appropriate scale
    scaleX = destWidth / sourceWidth;
    scaleY = destHeight / sourceHeight;

    switch (scale) {
      case SC.BEST_FILL:
        scale = scaleX > scaleY ? scaleX : scaleY;
        break;
      case SC.BEST_FIT:
        scale = scaleX < scaleY ? scaleX : scaleY;
        break;
      case SC.BEST_FIT_DOWN_ONLY:
        if ((sourceWidth > destWidth) || (sourceHeight > destHeight)) {
          scale = scaleX < scaleY ? scaleX : scaleY;
        } else {
          scale = 1.0;
        }
        break;
      case SC.SCALE_NONE:
        scale = 1.0;
        break;
      default: // Number
        if (isNaN(window.parseFloat(scale)) || (window.parseFloat(scale) <= 0)) {
          SC.Logger.warn("SC.InnerFrame: The scale '%@' was not understood.  Scale must be one of SC.FILL, SC.BEST_FILL, SC.BEST_FIT, SC.BEST_FIT_DOWN_ONLY or a positive number greater than 0.00.".fmt(scale));

          // Don't attempt to scale or offset the image
          return result;
        }
    }

    sourceWidth *= scale;
    sourceHeight *= scale;
    result.width = Math.round(sourceWidth);
    result.height = Math.round(sourceHeight);

    // Align the image within its frame
    switch (align) {
      case SC.ALIGN_LEFT:
        result.x = 0;
        result.y = (destHeight / 2) - (sourceHeight / 2);
        break;
      case SC.ALIGN_RIGHT:
        result.x = destWidth - sourceWidth;
        result.y = (destHeight / 2) - (sourceHeight / 2);
        break;
      case SC.ALIGN_TOP:
        result.x = (destWidth / 2) - (sourceWidth / 2);
        result.y = 0;
        break;
      case SC.ALIGN_BOTTOM:
        result.x = (destWidth / 2) - (sourceWidth / 2);
        result.y = destHeight - sourceHeight;
        break;
      case SC.ALIGN_TOP_LEFT:
        result.x = 0;
        result.y = 0;
        break;
      case SC.ALIGN_TOP_RIGHT:
        result.x = destWidth - sourceWidth;
        result.y = 0;
        break;
      case SC.ALIGN_BOTTOM_LEFT:
        result.x = 0;
        result.y = destHeight - sourceHeight;
        break;
      case SC.ALIGN_BOTTOM_RIGHT:
        result.x = destWidth - sourceWidth;
        result.y = destHeight - sourceHeight;
        break;
      default: // SC.ALIGN_CENTER || SC.ALIGN_MIDDLE
        
        if (align !== SC.ALIGN_CENTER && align !== SC.ALIGN_MIDDLE) {
          SC.Logger.warn("SC.InnerFrame: The align '%@' was not understood.  Align must be one of SC.ALIGN_CENTER/SC.ALIGN_MIDDLE, SC.ALIGN_LEFT, SC.ALIGN_RIGHT, SC.ALIGN_TOP, SC.ALIGN_BOTTOM, SC.ALIGN_TOP_LEFT, SC.ALIGN_TOP_RIGHT, SC.ALIGN_BOTTOM_LEFT or SC.ALIGN_BOTTOM_RIGHT.".fmt(align));
        }
        
        result.x = (destWidth / 2) - (sourceWidth / 2);
        result.y = (destHeight / 2) - (sourceHeight / 2);
    }

    return result;
  },

  /**
    Determines how the shape will scale to fit within its containing space. Possible values:

      - SC.SCALE_NONE
      - SC.FILL
      - SC.BEST_FILL
      - SC.BEST_FIT
      - SC.BEST_FIT_DOWN_ONLY

    @type String
    @default SC.FILL
  */
  scale: SC.FILL
};

/* >>>>>>>>>> BEGIN source/mixins/static_layout.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/**
  @namespace

  SC.StaticLayout is now built in to SC.View.  You do not need to
  apply this mixin to use static layout.  Just set useStaticLayout to YES.



  Normally, SproutCore views use absolute positioning to display themselves
  on the screen.  While this is both the fastest and most efficient way to
  display content in the web browser, sometimes your user interface might need
  to take advantage of the more advanced "flow" layout offered by the browser
  when you use static and relative positioning.

  This mixin can be added to a view class to enable the use of any kind of
  static and relative browser positioning.  In exchange for using static
  layout, you will lose a few features that are normally available on a view
  class such as the 'frame' and 'clippingFrame' properties as well as
  notifications when your view or parentView are resized.

  Normally, if you are allowing the browser to manage the size and positioning
  of your view, these feature will not be useful to your code anyway.

  ## Using StaticLayout

  To enable static layout on your view, just include this mixin on the view.
  SproutCore's builtin views that are capable of being used in static
  layouts already incorporate this mixin.  Then set the "useStaticLayout"
  property on your view class to YES.

  You can then use CSS or the render() method on your view to setup the
  positioning on your view using any browser layout mechanism you want.

  ## Example

      // JavaScript

      MyApp.CommentView = SC.View.extend(SC.StaticLayout, {

        classNames: ['comment-view'],

        useStaticLayout: YES,

        ...
      });

      // CSS

      .comment-view {
        display: block;
        position: relative;
      }

  @deprecated Version 1.10
  @since SproutCore 1.0
*/
SC.StaticLayout = {

  /**
    Walk like a duck.  Used to determine that this mixin has been applied.
    Note that a view that hasStaticLayout still may not actually use static
    layout unless useStaticLayout is also set to YES.

    @type Boolean
    @default YES
  */
  hasStaticLayout: YES,

  initMixin: function () {
    
    SC.warn("The SC.StaticLayout mixin code is included in SC.View directly now and the mixin has been deprecated.  Please do not mix it into your views.");
    
  }

};

/* >>>>>>>>>> BEGIN source/mixins/validatable.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/**
  @namespace

  Views that include the Validatable mixin can be used with validators to
  ensure their values are valid.

*/
SC.Validatable = {

  /** @private */
  initMixin: function() {
    this._validatable_validatorDidChange() ;
  },

  /**
    The validator for this field.

    Set to a validator class or instance.  If this points to a class, it will
    be instantiated when the validator is first used.

    @type SC.Validator
    @default null
  */
  validator: null,

  /**
    This property must return the human readable name you want used when
    describing an error condition.  For example, if set this property to
    "Your Email", then the returned error string might be something like
    "Your Email is not valid".

    You can return a loc string here if you like.  It will be localized when
    it is placed into the error string.

    @type String
    @default null
  */
  errorLabel: null,

  /**
    YES if the receiver is currently valid.

    This property watches the value property by default.  You can override
    this property if you want to use some other method to calculate the
    current valid state.

    @field
    @type Boolean
    @default YES
  */
  isValid: function() {
    return SC.typeOf(this.get('value')) !== SC.T_ERROR;
  }.property('value'),

  /**
    The form that the view belongs to.  May be null if the view does not
    belong to a form.  This property is usually set automatically by an
    owner form view.

    @type SC.View
    @default null
  */
  ownerForm: null,

  /**
    Attempts to validate the receiver.

    Runs the validator and returns SC.VALIDATE_OK, SC.VALIDATE_NO_CHANGE,
    or an error object.  If no validator is installed, this method will
    always return SC.VALIDATE_OK.

    @param {Boolean} partialChange YES if this is a partial edit.
    @returns {String} SC.VALIDATE_OK, error, or SC.VALIDATE_NO_CHANGE
  */
  performValidate: function(partialChange) {
    var ret = SC.VALIDATE_OK ;

    if (this._validator) {
      var form = this.get('ownerForm') ;
      if (partialChange) {
        ret = this._validator.validatePartial(form,this) ;

        // if the partial returned NO_CHANGE, then check to see if the
        // field is valid anyway.  If it is not valid, then don't update the
        // value.  This way the user can have partially constructed values
        // without the validator trying to convert it to an object.
        if ((ret == SC.VALIDATE_NO_CHANGE) && (this._validator.validateChange(form, this) == SC.VALIDATE_OK)) {
          ret = SC.VALIDATE_OK;
        }
      } else ret = this._validator.validateChange(form, this) ;
    }
    return ret ;
  },

  /**
    Runs validateSubmit.  You should use this in your implementation of
    validateSubmit.  If no validator is installed, this always returns
    SC.VALIDATE_OK

    @returns {String}
  */
  performValidateSubmit: function() {
    return this._validator ? this._validator.validateSubmit(this.get('ownerForm'), this) : SC.VALIDATE_OK;
  },

  /**
    Runs a keydown validation.  Returns YES if the keydown should be
    allowed, NO otherwise.  If no validator is defined, always returns YES.

    @param {String} charStr the key string
    @returns {Boolean}
  */
  performValidateKeyDown: function(evt) {
    // ignore anything with ctrl or meta key press
    var charStr = evt.getCharString();
    if (!charStr) return YES ;
    return this._validator ? this._validator.validateKeyDown(this.get('ownerForm'), this, charStr) : YES;
  },

  /**
    Returns the validator object, if one has been created.

    @field
    @type SC.Validator
  */
  validatorObject: function() {
    return this._validator;
  }.property(),

  /**
    Invoked by the owner form just before submission.  Override with your
    own method to commit any final changes after you perform validation.

    The default implementation simply calls performValidateSubmit() and
    returns that value.

    @type Boolean
  */
  validateSubmit: function() { return this.performValidateSubmit(); },

  /**
    Convert the field value string into an object.

    This method will call the validators objectForFieldValue if it exists.

    @param {Object} fieldValue the raw value from the field.
    @param {Boolean} partialChange
    @returns {Object}
  */
  objectForFieldValue: function(fieldValue, partialChange) {
    return this._validator ? this._validator.objectForFieldValue(fieldValue, this.get('ownerForm'), this) : fieldValue ;
  },

  /**
    Convert the object into a field value.

    This method will call the validator's fieldValueForObject if it exists.

    @param object {Object} the objec to convert
    @returns {Object}
  */
  fieldValueForObject: function(object) {
    return this._validator ? this._validator.fieldValueForObject(object, this.get('ownerForm'), this) : object ;
  },

  /** @private */
  _validatable_displayObserver: function() {
    this.displayDidChange();
  }.observes('isValid'),

  /** @private */
  renderMixin: function(context) {
    context.setClass('invalid', !this.get('isValid'));
  },

  /** @private
    Invoked whenever the attached validator changes.
  */
  _validatable_validatorDidChange: function() {
    var form = this.get('ownerForm') ;
    var val = SC.Validator.findFor(form, this, this.get('validator')) ;
    if (val != this._validator) {
      this.propertyWillChange('validatorObject');
      if (this._validator) this._validator.detachFrom(form, this) ;
      this._validator = val;
      if (this._validator) this._validator.attachTo(form, this) ;
      this.propertyDidChange('validatorObject');
    }
  }.observes('validator', 'ownerForm')

};

/* >>>>>>>>>> BEGIN source/protocols/swap_transition_protocol.js */
// ==========================================================================
// Project:   SproutCore
// Copyright: @2013 7x7 Software, Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


/** @namespace
  This protocol defines the allowable transition plugin methods.

  SC.ContainerView uses transition plugins to setup, execute and cleanup the
  swapping between views and expects the given transition plugin object
  to implement the methods in this protocol.
*/
SC.SwapTransitionProtocol = {

  /**
    This optional method is called to set up the entrance transition.

    Use this method to adjust the layout of the container and new content so
    that it may be properly animated.  For example, you may need to adjust the
    content from a flexible layout (i.e. { left: 0, top: 0, right: 0, bottom: 0 })
    to a fixed layout (i.e. { left: 0, top: 0, width: 100, height: 200 })
    so that it can be moved.

    @param {SC.ContainerView} container The SC.ContainerView using this plugin.
    @param {SC.View} content The new view added to the container.
    @param {SC.View} previousStatechart The current content statechart in the container.
    @param {Object} options Options to modify the transition.
  */
  willBuildInToView: function (container, content, previousStatechart, options) {},

  /**
    This optional method is called to transition the new content in.

    When the transition completes, the function must call the entered()
    method on the statechart.

    @param {SC.ContainerContentStatechart} statechart The statechart for the content view.
    @param {SC.ContainerView} container The SC.ContainerView using this plugin.
    @param {SC.View} content The new view added to the container.
    @param {SC.View} previousStatechart The current content statechart in the container.
    @param {Object} options Options to modify the transition.
  */
  buildInToView: function (statechart, container, content, previousStatechart, options) {},

  /**
    This optional method is called to cancel an active entrance transition.

    Use this method to stop the animation and immediately clean up the views.

    @param {SC.ContainerView} container The SC.ContainerView using this plugin.
    @param {SC.View} content The new view in the container, which is still transitioning in.
    @param {Object} options Options to modify the transition.
  */
  buildInDidCancel:  function (container, content, options) {},

  /**
    This optional method is called to clean up the entrance the transition.

    Use this method to adjust the layout of the container and new content after
    the transition completes.  For example, you may need to adjust the layout
    from a fixed layout (i.e. { left: 0, top: 0, width: 100, height: 200 })
    to a flexible layout (i.e. { left: 0, top: 0, right: 0, bottom: 0 }).

    @param {SC.ContainerView} container The SC.ContainerView using this plugin.
    @param {SC.View} content The new view added to the container.
    @param {Object} options Options that were used to modify the transition.
  */
  didBuildInToView: function (container, content, options) {},

  /**
    This optional method is called to set up the exit transition.

    Use this method to adjust the layout of the container and new content so
    that it may be properly animated.  For example, you may need to adjust the
    content from a flexible layout (i.e. { left: 0, top: 0, right: 0, bottom: 0 })
    to a fixed layout (i.e. { left: 0, top: 0, width: 100, height: 200 })
    so that it can be moved.

    @param {SC.ContainerView} container The SC.ContainerView using this plugin.
    @param {SC.View} content The old view being removed from the container.
    @param {Object} options Options to modify the transition.
  */
  willBuildOutFromView: function (container, content, options) {},

  /**
    This optional method is called to transition the old content out.

    When the transition completes, the function must call the exited()
    method on the statechart.

    Note that a view may be repeatedly built out before it has completed.  In
    order to accelerate the build out transition, the exitCount parameter will
    be incremented each time buildOutFromView is called.  The initial value
    will always be 1.

    @param {SC.ContainerContentStatechart} statechart The statechart for the content view.
    @param {SC.ContainerView} container The SC.ContainerView using this plugin.
    @param {SC.View} content The old view being removed from the container.
    @param {Object} options Options to modify the transition.
    @param {Number} exitCount The number of times the content is being built out.
  */
  buildOutFromView: function (statechart, container, content, options, exitCount) {},

  /**
    This optional method is called to cancel an active exit transition.

    Use this method to stop the animation and immediately clean up the views.

    @param {SC.ContainerView} container The SC.ContainerView using this plugin.
    @param {SC.View} content The old view being removed from the container, which is still transitioning out.
    @param {Object} options Options to modify the transition.
  */
  buildOutDidCancel: function (container, content, options) {},

  /**
    This optional method is called to clean up the entrance the transition.

    Use this method to adjust the layout of the container and new content after
    the transition completes.  For example, you may need to adjust the layout
    from a fixed layout (i.e. { left: 0, top: 0, width: 100, height: 200 })
    to a flexible layout (i.e. { left: 0, top: 0, right: 0, bottom: 0 }).

    @param {SC.ContainerView} container The SC.ContainerView using this plugin.
    @param {SC.View} content The new view added to the container.
    @param {Object} options Options that were used to modify the transition.
  */
  didBuildOutFromView: function (container, content, options) {},

  /**
    This optional method is called to adjust the clippingFrame during the
    transition.

    Because some childViews are altered by the clippingFrame of their parent
    views (notably collection views), we may need to provide a modified
    clipping frame while the transition is in process.

    For example, a push transition should double the regular clippingFrame
    of the container to fit both the new and current content while the
    transition is in progress.

    @param {SC.ContainerView} container The SC.ContainerView using this plugin.
    @param {Object} clippingFrame The current clippingFrame of the container.
    @param {Object} options Options used to modify the transition.
    @returns clippingFrame
  */
  transitionClippingFrame: function (container, clippingFrame, options) {}

};

/* >>>>>>>>>> BEGIN source/render_delegates/render_delegate.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/**
  @class
  Base class for all render delegates.

  You should use SC.RenderDelegate or a subclass of it as the base for all 
  of your render delegates. SC.RenderDelegate offers many helper methods 
  and can be simpler to subclass between themes than `SC.Object`.

  Creating & Subclassing
  ===
  You create render delegates just like you create SC.Objects:

      MyTheme.someRenderDelegate = SC.RenderDelegate.create({ ... });

  You can subclass a render delegate and use that:

      MyTheme.RenderDelegate = SC.RenderDelegate.extend({ ... });
      MyTheme.someRenderDelegate = MyTheme.RenderDelegate.create({});

  And you can even subclass instances or SC.RenderDelegate:

      MyTheme.someRenderDelegate = SC.RenderDelegate.create({ ... });
      MyTheme.otherRenderDelegate = MyTheme.someRenderDelegate.create({ ... });

      // this allows you to subclass another theme's render delegate:
      MyTheme.buttonRenderDelegate = SC.BaseTheme.buttonRenderDelegate.create({ ... });

  For render delegates, subclassing and instantiating are the same.

  NOTE: Even though `.extend` and `.create` technically do the same thing, 
  convention dictates that you use `.extend` for RenderDelegates that 
  will be used primarily as base classes, and `create` for RenderDelegates
  that you expect to be instances.

  Rendering and Updating
  ===
  Render delegates are most commonly used for two things: rendering and updating
  DOM representations of controls.

  Render delegates use their `render` and `update` methods to do this:

      render: function(dataSource, context) {
        // rendering tasks here
        // example:
        context.begin('div').addClass('title')
          .text(dataSource.get('title')
        .end();
      },

      update: function(dataSource, jquery) {
        // updating tasks here
        // example:
        jquery.find('.title').text(dataSource.get('title'));
      }

  Variables
  ===
  The data source provides your render delegate with all of the information
  needed to render. However, the render delegate's consumer--usually a view--
  may need to get information back.

  For example, `SC.AutoResize` resizes controls to fit their text. You can use
  it to size a button to fit its title. But it can't just make the button
  have the same width as its title: it needs to be a little larger to make room
  for the padding to the left and right sides of the title.

  This padding will vary from theme to theme.
  
  You can specify properties on the render delegate like any other property:

      MyRenderDelegate = SC.RenderDelegate.create({
        autoSizePadding: 10
        ...
      });

  But there are multiple sizes of buttons; shouldn't the padding change as
  well? You can add hashes for the various control sizes and override properties:

      SC.RenderDelegate.create({
        autoSizePadding: 10,

        'sc-jumbo-size': {
          autoResizePadding: 20
        }

  For details, see the discussion on size helpers below.

  You can also calculate values for the data source. In this example, we calculate
  the autoSizePadding to equal half the data source's height:

      SC.RenderDelegate.create({
        autoSizePaddingFor: function(dataSource) {
          if (dataSource.get('frame')) {
            return dataSource.get('frame').height / 2;
          }
        }


  When SC.ButtonView tries to get `autoSizePadding`, the render delegate will look for
  `autoSizePaddingFor`. It will be called if it exists. Otherwise, the property will
  be looked up like normal.

  Note: To support multiple sizes, you must also render the class name; see size
  helper discussion below.

  Helpers
  ===
  SC.RenderDelegate have "helper methods" to assist the rendering process.
  There are a few built-in helpers, and you can add your own.

  Slices
  ----------------------
  Chance provides the `includeSlices` method to easily slice images for
  use in the SproutCore theme system.

      includeSlices(dataSource, context, slices);

  You can call this to add DOM that matches Chance's `@include slices()`
  directive. For example:

      MyTheme.buttonRenderDelegate = SC.RenderDelegate.create({
        className: 'button',
        render: function(dataSource, context) {
          this.includeSlices(dataSource, context, SC.THREE_SLICE);
        }
      });

  DOM elements will be added as necessary for the slices. From your CSS, you
  can match it like this:

      $theme.button {
        @include slices('button.png', $left: 3, $right: 3);
      }

  See the Chance documentation at http://guides.sproutcore.com/chance.html
  for more about Chance's `@include slices` directive.

  Sizing Helpers
  -------------------------
  As discussed previously, you can create hashes of properties for each size. 
  However, to support sizing, you must render the size's class name.

  Use the `addSizeClassName` and `updateSizeClassName` methods:

      SC.RenderDelegate.create({
        render: function(dataSource, context) {
          // if you want to include a class name for the control size
          // so you can style it via CSS, include this line:
          this.addSizeClassName(dataSource, context);

          ...
        },

        update: function(dataSource, jquery) {
          // and don't forget to use its companion in update as well:
          this.updateSizeClassName(dataSource, jquery);

          ...
        }
      });

  Controls that allow multiple sizes should also be able to automatically choose
  the correct size based on the `layout` property supplied by the user. To support
  this, you can add properties to your size hashes:

      'sc-regular-size': {
        // to match _only_ 24px-high buttons
        height: 24,

        // or, alternatively, to match ones from 22-26:
        minHeight: 20, maxHeight: 26,

        // you can do the same for width if you wanted
        width: 100
      }

  The correct size will be calculated automatically when `addSlizeClassName` is
  called. If the view explicitly supplies a control size, that size will be used;
  otherwise, it will be calculated automatically based on the properties in your
  size hash.

  Adding Custom Helpers
  ---------------------
  You can mix your own helpers into this base class by calling 
  SC.RenderDelegate.mixin; they will be available to all render delegates:

      SC.RenderDelegate.mixin({
        myHelperMethod: function(dataSource) { ... }
      });


  You can then use the helpers from your render delegates:

      MyTheme.someRenderDelegate = SC.RenderDelegate.create({
        className: 'some-thingy',
        render: function(dataSource, context) {
          this.myHelperMethod(dataSource);
        }
      });


  By convention, all render delegate methods should take a `dataSource` as 
  their first argument. If they do any rendering or updating, their second
  argument should be the `SC.RenderContext` or `jQuery` object to use.

  In addition, helpers like these are only meant for methods that should
  be made available to _all_ render delegates. If your method is specific
  to just one, add it directly; if it is specific to just a few in your
  own theme, consider just using mixins or subclassing SC.RenderDelegate:

      // If you use it in a couple of render delegates, perhaps a mixin
      // would be best:
      MyTheme.MyRenderHelper = {
        helper: function(dataSource) {
          ...
        }
      };

      MyTheme.myRenderDelegate = SC.RenderDelegate.create(MyTheme.MyRenderHelper, {
        render: function(dataSource, context) { ... }
      });


      // If you use it in all render delegates in your theme, perhaps it
      // would be better to create an entire subclass of
      // SC.RenderDelegate:
      MyTheme.RenderDelegate = SC.RenderDelegate.extend({
        helper: function(dataSource) {
          ...
        }
      });

      MyTheme.myRenderDelegate = MyTheme.RenderDelegate.create({
        render: function(dataSource, context) { ... }
      });

  Data Sources
  ===
  Render delegates get the content to be rendered from their data sources.

  A data source can be any object, so long as the object implements
  the following methods:

  - `get(propertyName)`: Returns a value for a given property.
  - `didChangeFor(context, propertyName)`: Returns YES if any properties
    listed have changed since the last time `didChangeFor` was called with
    the same context.

  And the following properties (to be accessed through `.get`):

  - `theme`: The theme being used to render.
  - `renderState`: An empty hash for the render delegate to save state in.
    While render delegates are _usually_ completely stateless, there are
    cases where they may need to save some sort of state.
*/
SC.RenderDelegate = /** @scope SC.RenderDelegate.prototype */{
  
  // docs will look more natural if these are all considered instance
  // methods/properties.

  /**
    Creates a new render delegate based on this one. When you want to
    create a render delegate, you call this:
   
        MyTheme.myRenderDelegate = SC.RenderDelegate.create({
          className: 'my-render-delegate',
          render: function(dataSource, context) {
            // your code here...
          }
        })
  */
  create: function() {
    var ret = SC.beget(this);

    var idx, len = arguments.length;
    for (idx = 0; idx < len; idx++) {
      ret.mixin(arguments[idx]);
    }

    return ret;
  },

  /**
    Adds extra capabilities to this render delegate.
   
    You can use this to add helpers to all render delegates:
   
        SC.RenderDelegate.reopen({
          myHelperMethod: function(dataSource) { ... }
        });
   
  */
  reopen: function(mixin) {
    var i, v;
    for (i in mixin) {
      v = mixin[i];
      if (!mixin.hasOwnProperty(i)) {
        continue;
      }

      if (typeof v === 'function' && v !== this[i]) {
        v.base = this[i] || SC.K;
      }

      if (v && v.isEnhancement && v !== this[i]) {
        v = SC._enhance(this[i] || SC.K, v);
      }

      this[i] = v;
    }
  },

  /**
    Returns the specified property from this render delegate.
    Implemented to match SC.Object's API.
  */
  get: function(propertyName) { return this[propertyName]; },

  /**
    Gets or generates the named property for the specified
    dataSource. If a method `propertyName + 'For'` is found,
    it will be used to compute the value, `dataSource`
    being passed as an argument. Otherwise, it will simply
    be looked up on the render delegate.
    
    NOTE: this implementation is a reference implementation. It
    is overridden in the sizing code (helpers/sizing.js) to be
    size-sensitive.
  */
  getPropertyFor: function(dataSource, propertyName) {
    if (this[propertyName + 'For']) {
      return this[propertyName + 'For'](dataSource, propertyName);
    }

    return this[propertyName];
  },

  /**
    All render delegates should have a class name. Any time a render delegate is
    used, this name should be added as a class name (`SC.View`s do this
    automatically).
  */
  className: undefined,

  /**
    Writes the DOM representation of this render delegate to the
    supplied `SC.RenderContext`, using the supplied `dataSource`
    for any data needed.
    
    @method
    @param {DataSource} dataSource An object from which to get
    data. See documentation on data sources above.
    @param {SC.RenderContext} context A context to render DOM into.
  */
  render: function(dataSource, context) {

  },

  /**
    Updates the DOM representation of this render delegate using
    the supplied `jQuery` instance and `dataSource`.
    
    @method
    @param {DataSource} dataSource An object from which to get
    data. See documentation on data sources above.
    @param {jQuery} jquery A jQuery instance containing the DOM
    element to update. This will be the DOM generated by `render()`.
  */
  update: function(dataSource, jQuery) {

  }
};

// create and extend are technically identical.
SC.RenderDelegate.extend = SC.RenderDelegate.create;

// and likewise, as this is both a class and an instance, mixin makes
// sense instead of reopen...
SC.RenderDelegate.mixin = SC.RenderDelegate.reopen;

/* >>>>>>>>>> BEGIN source/render_delegates/canvas_image.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2009 Sprout Systems, Inc. and contributors.
//            Portions ©2010-2011 Strobe Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('render_delegates/render_delegate');

/**
  @class
  Renders and updates DOM representations of an image.

  Parameters
  --------------------------
  Expects these properties on the data source:

  - image: An Image object which has completed loading

  If any of these are not present in the data source, the render delegate
  will throw an error.

  Optional Parameters:
  ---------------------------
  If present, these properties will be used.

  - width: Used on the canvas element. If not provided, 0 is used and the canvas
            will not be visible.
  - height: Used on the canvas element. If not provided, 0 is used and the canvas
            will not be visible.
  - scale: If provided, the image will maintain aspect ratio as specified by this
          property. One of
            - SC.SCALE_NONE
            - SC.FILL
            - SC.BEST_FILL
            - SC.BEST_FIT
            - SC.BEST_FIT_DOWN_ONLY
            - percentage {Number}
          If not provided, SC.FILL will be the default (ie. expected image behaviour)
  - align: If provided, the image will align itself within its frame.  One of
            - SC.ALIGN_CENTER
            - SC.ALIGN_TOP_LEFT
            - SC.ALIGN_TOP
            - SC.ALIGN_TOP_RIGHT
            - SC.ALIGN_RIGHT
            - SC.ALIGN_BOTTOM_RIGHT
            - SC.ALIGN_BOTTOM
            - SC.ALIGN_BOTTOM_LEFT
            - SC.ALIGN_LEFT
  - backgroundColor: If provided, the canvas will render a backgroundColor
*/

SC.BaseTheme.canvasImageRenderDelegate = SC.RenderDelegate.create({
  className: 'canvasImage',

  /** @private
    We don't have an element yet, so we do the minimal necessary setup
    here.
  */
  render: function (dataSource, context) {
    var width = dataSource.get('width') || 0,
        height = dataSource.get('height') || 0,
        type = dataSource.get('type') || SC.IMAGE_TYPE_URL,
        value = dataSource.get('value');

    // Support for CSS sprites (TODO: Remove this)
    if (value && type === SC.IMAGE_TYPE_CSS_CLASS) {
      context.addClass(value);
      dataSource.renderState._last_class = value;
    }

    context.setAttr('width', width);
    context.setAttr('height', height);
  },

  update: function (dataSource, jquery) {
    var elem = jquery[0],
        image = dataSource.get('image'),
        frame = dataSource.get('frame'),
        frameWidth = frame.width,
        frameHeight = frame.height,
        innerFrame = dataSource.get('innerFrame'),
        backgroundColor = dataSource.get('backgroundColor'),
        renderState = dataSource.get('renderState'),
        context,
        lastClass = dataSource.renderState._last_class,
        type = dataSource.get('type') || SC.IMAGE_TYPE_URL,
        value = dataSource.get('value');

    // Support for CSS sprites (TODO: Remove this)
    if (lastClass) jquery.removeClass(lastClass);
    if (value && type === SC.IMAGE_TYPE_CSS_CLASS) {
      jquery.addClass(value);
      dataSource.renderState._last_class = value;

      // Clear the context in case there was a URL previously
      if (elem && elem.getContext) {
        context = elem.getContext('2d');
        context.clearRect(0, 0, frameWidth, frameHeight);
      }
    } else {

      // We only care about specific values, check specifically for what matters
      var innerFrameDidChange = ![innerFrame.x, innerFrame.y, innerFrame.width, innerFrame.height].isEqual(renderState._lastInnerFrameValues),
          elemSizeDidChange = ![elem.width, elem.height].isEqual(renderState._lastElemSizeValues),
          backgroundDidChange = dataSource.didChangeFor('canvasImageRenderDelegate', 'backgroundColor'),
          imageDidChange = dataSource.didChangeFor('canvasImageRenderDelegate', 'image') || (image && image.complete) !== renderState._lastImageComplete;

      if (elemSizeDidChange || innerFrameDidChange || backgroundDidChange || imageDidChange) {

        if (elem && elem.getContext) {
          elem.height = frameHeight;
          elem.width = frameWidth;

          context = elem.getContext('2d');

          context.clearRect(0, 0, frameWidth, frameHeight);

          if (backgroundColor) {
            context.fillStyle = backgroundColor;
            context.fillRect(0, 0, frameWidth, frameHeight);
          }

          if (image && image.complete) {
            context.drawImage(image, Math.floor(innerFrame.x), Math.floor(innerFrame.y), Math.floor(innerFrame.width), Math.floor(innerFrame.height));
          }
        }

        // Update caches
        renderState._lastInnerFrameValues = [innerFrame.x, innerFrame.y, innerFrame.width, innerFrame.height];
        renderState._lastElemSizeValues = [elem.width, elem.height];
        renderState._lastImageComplete = image && image.complete;
      }
    }
  }

});

/* >>>>>>>>>> BEGIN source/render_delegates/container.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('render_delegates/render_delegate');

SC.BaseTheme.containerRenderDelegate = SC.RenderDelegate.create({
  render: function(dataSource, context) {

  },
  
  update: function() {

  }
});

/* >>>>>>>>>> BEGIN source/render_delegates/helpers/sizing.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2009 Sprout Systems, Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('render_delegates/render_delegate');

SC.RenderDelegate.reopen({
  /**
    A list of size names to look for when automatically determining
    control size. By default, this has all of the SproutCore control sizes.
  */
  sizes: [
    SC.TINY_CONTROL_SIZE, SC.SMALL_CONTROL_SIZE,
    SC.REGULAR_CONTROL_SIZE, SC.LARGE_CONTROL_SIZE,
    SC.HUGE_CONTROL_SIZE, SC.JUMBO_CONTROL_SIZE
  ],

  /**
    Determines the correct size for the given data source, and returns the
    hash, if any, representing it.
   
    The hashes to choose from are properties on the render delegate. You define
    them with the same name as you would use for styling. For example,
    SC.REGULAR_CONTROL_SIZE uses a property name 'sc-regular-size':
   
        SC.RenderDelegate.create({
          'sc-regular-size': {
            // my properties here
          }
   
    If no matching size is found, the hash (if any) for SC.REGULAR_CONTROL_SIZE
    will be returned.
   
    @param {DataSource} dataSource The data source in which to find `controlSize`
    or `frame` and to determine the size for.
   
    @returns {Hash undefined}
  */
  sizeFor: function(dataSource) {
    var controlSize = dataSource.get('controlSize'), size, idx, len;

    // if there is a control size set on the control
    // then we need to use it, and give an error if we
    // don't have it.
    if (controlSize) {
      if (!this[controlSize]) {
        // create a hash for the control size
        this[controlSize] = {};
      }

      size = this[controlSize];

      // make sure there's a name on the size for use as class name
      if (!size.name) {
        size.name = controlSize;
      }

      return size;
    }

    // try to determine control size for the supplied frame
    // TODO: cache this in dataSource.renderState
    var frame = dataSource.get('frame');
    if (!frame) {
      size = this['sc-regular-size'];

      // create the size hash if needed
      if (!size) { size = this['sc-regular-size'] = {}; }
      if (!size.name) { size.name = 'sc-regular-size'; }
      return size;
    }

    // loop to automatically find size
    for (idx = 0; idx < len; idx++) {
      key = sizes[idx];
      size = this[key];

      // when the size is not defined, skip it.
      if (!size) {
        continue;
      }

      if (
        // if no auto-size-selection params are supplied, then we cannot
        // automatically select a size...
        (
          size.width === undefined && size.height === undefined && 
          size.minHeight === undefined && size.minWidth === undefined &&
          size.maxHeight === undefined && size.maxWidth === undefined
        ) ||

        // otherwise, if any are defined and are non-equal
        (size.width !== undefined && frame.width !== size.width) ||
        (size.minWidth !== undefined && frame.width < size.minWidth) ||
        (size.maxWidth !== undefined && frame.width > size.maxWidth) ||

        (size.height !== undefined && frame.height !== size.height) ||
        (size.minHeight !== undefined && frame.height < size.minHeight) ||
        (size.maxHeight !== undefined && frame.height < size.maxHeight)
      ) {
        continue;
      }

      // the size needs a name to use as a class name. If one is not already
      // present, set it to the key.
      if (!size.name) {
        size.name = key;
      }

      return size;
    }

    // hardcoded to return regular size if defined
    size = this['sc-regular-size'];

    // create the size hash if needed
    if (!size) { size = this['sc-regular-size'] = {}; }
    if (!size.name) { size.name = 'sc-regular-size'; }


    return size;
  },

  /**
    Determines the proper size for the dataSource, and then renders the class
    name corresponding to that size.
  */
  addSizeClassName: function(dataSource, context) {
    var size = this.sizeFor(dataSource);
    if (size) {
      context.addClass(size.name);
    }
  },

  /**
    Determines the proper size for the dataSource, and then updates
    the DOM to include that size's class name.
  */
  updateSizeClassName: function(dataSource, jquery) {
    var size = this.sizeFor(dataSource);
    if (size) {
      jquery.addClass(size.name);
    }
  },

  /**
    Retrieves the given property for the specified data source. This property
    may be static, or may be computed specifically for this data source. This
    version fo `getPropertyFor` will check in your size hashes to see if any
    properties have been overridden.
    
    @param {DataSource} dataSource The data source to get the property
    for. Some properties may differ based on the data source; for instance,
    some may have different values depending on size.
    @param {String} propertyName The name of the property to retrieve.
  */
  getPropertyFor: function(dataSource, propertyName) {
    var size = this.sizeFor(dataSource);
    if (size) {
      if (size[propertyName + 'For']) {
        return size[propertyName + 'For'](dataSource, propertyName);
      } else if (size[propertyName] !== undefined) {
        return size[propertyName];
      }
    }

    if (this[propertyName + 'For']) {
      return this[propertyName + 'For'];
    }

    return this[propertyName];
  }
});

/* >>>>>>>>>> BEGIN source/render_delegates/image.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2009 Sprout Systems, Inc. and contributors.
//            Portions ©2010-2011 Strobe Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('render_delegates/render_delegate');

/**
  @class
  Renders and updates DOM representations of an image.

  Parameters
  --------------------------
  Expects these properties on the data source:

  - image: An Image object which has completed loading

  If any of these are not present in the data source, the render delegate
  will throw an error.

  Optional Parameters:
  ---------------------------
  If present, these properties will be used.

  - imageValue: A String which represents the src or CSS class of the image
  - displayToolTip: A String which is rendered as a toolTip on the element
  - type: The type of image being rendered. One of:
              - SC.IMAGE_TYPE_NONE
              - SC.IMAGE_TYPE_URL
              - SC.IMAGE_TYPE_CSS_CLASS
          If not provided, SC.IMAGE_TYPE_URL is the default
*/

SC.BaseTheme.imageRenderDelegate = SC.RenderDelegate.create({
  className: 'image',

  render: function (dataSource, context) {
    var image = dataSource.get('image'),
      value = dataSource.get('value'),
      type = dataSource.get('type') || SC.IMAGE_TYPE_URL,
      toolTip = dataSource.get('toolTip');

    // Place the img within a div, so that we may scale & offset the img
    context = context.begin('img');
    context.setAttr('src', image.src);

    // Support for CSS sprites (TODO: Remove this)
    if (value && type === SC.IMAGE_TYPE_CSS_CLASS) {
      context.addClass(value);
      dataSource.renderState._last_class = value;
    }

    if (toolTip) {
      context.setAttr('title', toolTip);
      context.setAttr('alt', toolTip);
    }

    // Adjust the layout of the img
    context.addStyle(this.imageStyles(dataSource));

    context = context.end();
  },

  update: function (dataSource, jquery) {
    var image = dataSource.get('image'),
      lastClass = dataSource.renderState._last_class,
      value = dataSource.get('value'),
      type = dataSource.get('type') || SC.IMAGE_TYPE_URL,
      toolTip = dataSource.get('toolTip');

    jquery = jquery.find('img');

    jquery.attr('src', image.src);

    // Support for CSS sprites (TODO: Remove this)
    if (lastClass) jquery.removeClass(lastClass);
    if (value && type === SC.IMAGE_TYPE_CSS_CLASS) {
      jquery.addClass(value);
      dataSource.renderState._last_class = value;
    }

    if (toolTip) {
      jquery.attr('title', toolTip);
      jquery.attr('alt', toolTip);
    }

    // Adjust the layout of the img
    jquery.css(this.imageStyles(dataSource));
  },

  imageStyles: function (dataSource) {
    var innerFrame = dataSource.get('innerFrame');
    return {
      'position': 'absolute',
      'left': Math.round(innerFrame.x),
      'top': Math.round(innerFrame.y),
      'width': Math.round(innerFrame.width),
      'height': Math.round(innerFrame.height)
    };
  }

});

/* >>>>>>>>>> BEGIN source/render_delegates/label.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('render_delegates/render_delegate');

/**
  @class
  Renders and updates DOM representations of a label.

  Parameters
  --------------------------
  Expects these properties on the data source:

  - title

  If any of these are not present in the data source, the render delegate
  will throw an error.

  Optional Parameters:
  ---------------------------
  If present, these properties will be used.

  - icon: should be either a class name or a URL
  - hint: allows the label to display a hint value if its title is empty.
  - escapeHTML: whether the HTML should be escaped to prevent XSS attacks
    and the like.
  - textAlign
  - needsEllipsis: Whether an ellipsis (...) should be added after the title
    if the title is too long.
*/

SC.BaseTheme.labelRenderDelegate = SC.RenderDelegate.create({
  className: 'label',

  render: function(dataSource, context) {
    var toolTip = dataSource.get('toolTip');

    this.addSizeClassName(dataSource, context);

    // Set the toolTip.
    if (toolTip) {
      context.setAttr('title', toolTip);
    }

    /*
      TODO [CC @ 1.5] These properties have been deprecated. We should remove them
            in the next release
    */
    context.addStyle({
      textAlign: dataSource.get('textAlign') || null
    });

    context.setClass('ellipsis', dataSource.get('needsEllipsis') || NO);
    context.setClass('icon', dataSource.get('icon') || NO);

    var html = this.htmlForTitleAndIcon(dataSource);
    context.push(html);

    // we could use didChangeFor, but in this case, checking the generated
    // HTML will probably be faster (and definitely be simpler)
    // because several properties are used.
    dataSource.get('renderState')._lastHTMLForTitleAndIcon = html;
  },

  update: function(dataSource, jquery) {
    var toolTip = dataSource.get('toolTip');

    this.updateSizeClassName(dataSource, jquery);

    /*
      TODO [CC @ 1.5] These properties have been deprecated. We should remove them
            in the next release
    */
    jquery.css({
      textAlign: dataSource.get('textAlign') || null
    });

    // Update the toolTip.
    if (toolTip) {
      jquery.attr('title', toolTip);
    } else {
      jquery.removeAttr('title');
    }

    jquery.setClass('ellipsis', dataSource.get('needsEllipsis') || NO);

    var html = this.htmlForTitleAndIcon(dataSource);
    if (dataSource.get('renderState')._lastHTMLForTitleAndIcon !== html) {
      jquery.html(html);
      dataSource.get('renderState')._lastHTMLForTitleAndIcon = html;
    }
  },

  /**
    Generates the HTML for the title and icon of the label. Render delegates can
    override this to change how that HTML renders without affecting the rest of the
    rendering of the label.

    @param dataSource The data source that provides the title and icon properties.
    @return the html to use
  */
  htmlForTitleAndIcon: function(dataSource) {
    var title = dataSource.get('title'),
        hint = dataSource.get('hint'),
        escapeHTML = dataSource.get('escapeHTML'),
        icon = dataSource.get('icon') || '';

    // Escape the body if needed. This prevents potential XSS attacks.
    if (title && escapeHTML) {
      title = SC.RenderContext.escapeHTML(title) ;
    }

    // Escape the hint if needed. This prevents potential XSS attacks.
    if (hint && escapeHTML) { hint = SC.RenderContext.escapeHTML(hint); }
    if (hint && !title) {
      title = "<span class='sc-hint'>" + hint + "</span>";
    }

    if (icon) {
      // If the icon property is the path to an image, create an image tag
      // that points to that URL.
      if (icon.indexOf('/') >= 0) {
        icon = '<img src="'+icon+'" alt="" class="icon" />';

      // Otherwise, the icon property is a class name that should be added
      // to the image tag. Display a blank image so that the user can add
      // background image using CSS.
      } else {
        icon = '<img src="'+SC.BLANK_IMAGE_URL+'" alt="" class="icon '+icon+'" />';
      }
    }

    return icon + (SC.none(title) ? '' : title);
  }

});

/* >>>>>>>>>> BEGIN source/tasks/task.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/**
  Represents a single task which can be run by a task queue. Note that tasks
  are actually allowed to add themselves back onto the queue if they did not/
  might not finish.
*/
SC.Task = SC.Object.extend({
  run: function(queue) {
    // if needed, you could put the task back on the queue for later finishing.
  }
});

/* >>>>>>>>>> BEGIN source/system/app_cache.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2012 7x7 Software, Inc.
// License:   Licensed under MIT license
// ==========================================================================
sc_require("tasks/task");


/** @private */
SC.AppCacheTask = SC.Task.extend({
  run: function () {
    window.applicationCache.update();
    SC.appCache._appCacheStatusDidChange();
  }
});


/** @class

  This is a very simple object that makes it easier to use the
  window.applicationCache in a SproutCore application.

  The reason this object exists is that SproutCore applications
  are excellent candidates for offline access but, it takes more than a little
  effort to understand the application cache's various possible states and
  events in order to use it effectively.

  You will likely find a use for SC.appCache in two scenarios.  The first is
  you want to ensure that your users are notified each time a new version of
  your application is deployed in order to ensure they get the latest version.
  Because of the manner in which the application cache works, a user may launch
  a previous version from the cache and not see the new version.  In this
  scenario, you would simply check the value of SC.appCache.get('hasNewVersion')
  at some point in your app's initialization cycle.  If hasNewVersion is true,
  you can then check SC.appCache.get('isNewVersionValid') to determine whether
  to show a message to the user informing them of the new version and reload
  the app or to log that the new version failed to upload so you can fix it.

  Note, because the application cache takes some time to determine if a new
  version exists, hasNewVersion may initially be `undefined`.  Therefore, you
  will likely want to add an observer to the property and continue on with
  your app.  By using an observer, you can also tap into another feature of
  SC.appCache, which is to lazily check for updates after the app is loaded.
  Typically, the browser only checks for updates on the initial load of a page,
  but by setting SC.appCache.set('shouldPoll', true), you can have SC.appCache
  check for updates in the background at a set interval.  Your observer will
  then fire if hasNewVersion ever changes while the app is in use.

  For example,

      // A sample application.
      MyApp = SC.Application.create({

        // Called when the value of SC.appCache.hasNewVersion changes.
        appCacheHasNewVersionDidChange: function () {
          var hasNewVersion = SC.appCache.get('hasNewVersion'),
            isNewVersionValid = SC.appCache.get('isNewVersionValid');

          if (hasNewVersion) {
            if (isNewVersionValid) {
              // Show a message to the user.
              MyApp.mainPage.get('newVersionAvailablePanel').append();
            } else {
              // There is a new version available, but it failed to load.
              SC.error('Failed to update application cache.');
            }

            // Clean up.
            SC.appCache.removeObserver('hasNewVersion', this, 'appCacheHasNewVersionDidChange');
          } else {
            // Start polling for new versions.  Because the observer is still attached,
            // appCacheHasNewVersionDidChange will be called if a new version ever becomes available.
            SC.appCache.set('shouldPoll', true);
          }

        }

      });

      // The loading state in our sample application.
      MyApp.LoadingState = SC.State.extend({

        enterState: function () {
          var hasNewVersion = SC.appCache.get('hasNewVersion');

          if (SC.none(hasNewVersion)) {
            // The application cache is either caching for the first time , updating or idle.
            // In either case we will observe it.
            SC.appCache.addObserver('hasNewVersion', MyApp, 'appCacheHasNewVersionDidChange');
          } else if (hasNewVersion) {
            // There is already a new version available, use our existing code to handle it.
            MyApp.appCacheHasNewVersionDidChange();
          } else {
            // There is no new version, but it's possible that one will appear.
            // User our existing code to start polling for new versions.
            MyApp.appCacheHasNewVersionDidChange();
            SC.appCache.addObserver('hasNewVersion', MyApp, 'appCacheHasNewVersionDidChange');
          }
        }

      });

  The second scenario is if you want to present a UI indicating when the app is
  ready for offline use.  Remember that it takes some time for the browser
  to retrieve all the resources in the manifest, so an app may be running for
  a while before it is ready for offline use.  In this scenario, you would
  observe the isReadyForOffline property of SC.appCache.

  Like hasNewVersion, isReadyForOffline has three possible values: undefined, true or false,
  where the property is undefined while the value is still undetermined.

  For example,

      // A sample view.
      MyApp.MyView = SC.View.extend({

        childView: ['offlineIndicatorCV'],

        // An image we use to indicate when the app is safe to use offline.
        offlineIndicatorCV: SC.ImageView.extend({
          valueBinding: SC.Binding.oneWay('SC.appCache.isReadyForOffline').
            transform(function (isReadyForOffline) {
              if (isReadyForOffline) {
                return 'offline-ready';
              } else if (SC.none(isReadyForOffline)) {
                return 'offline-unknown';
              } else {
                return 'offline-not-ready';
              }
            })
        })

      });

  The following are some excellent resources on the application cache that were
  used to develop this class:

  - [Using the application cache - HTML | MDN](https://developer.mozilla.org/en-US/docs/HTML/Using_the_application_cache)
  - [Appcache Facts](http://appcachefacts.info)
  - [Offline Web Applications - Dive Into HTML5](http://diveintohtml5.info/offline.html)

  @extends SC.Object
  @since Version 1.10
*/
SC.appCache = SC.Object.create(
/** @scope SC.appCache.prototype */{

  // ------------------------------------------------------------------------
  // Properties
  //

  /**
    Whether the new version is valid or not.

    This property is undefined until it can be determined that a new version exists
    or doesn't exist and if it does exist, whether it is valid or not.

    @field
    @type Boolean
    @default undefined
    @readonly
    */
  isNewVersionValid: function () {
    var hasNewVersion = this.get('hasNewVersion'),
      ret,
      status = this.get('status');

    if (SC.platform.supportsApplicationCache) {
      if (hasNewVersion) {
        if (status === window.applicationCache.UPDATEREADY) {
          ret = true;
        } else {
          ret = false;
        }
      } // Else we don't know yet.
    } else {
      // The platform doesn't support it, so it must always be false.
      ret = false;
    }

    return ret;
  }.property('hasNewVersion').cacheable(),

  /**
    Whether the application may be run offline or not.

    This property is undefined until it can be determined that the application
    has been cached or not cached.

    @field
    @type Boolean
    @default undefined
    @readonly
    */
  isReadyForOffline: function () {
    var ret,
      status = this.get('status');

    if (SC.platform.supportsApplicationCache) {
      if (status === window.applicationCache.IDLE ||
          status === window.applicationCache.UPDATEREADY) {
        ret = true;
      } else if (status === window.applicationCache.UNCACHED ||
          status === window.applicationCache.OBSOLETE) {
        ret = false;
      } // Else we don't know yet.
    } else {
      // The platform doesn't support it, so it must always be false.
      ret = false;
    }

    return ret;
  }.property('status').cacheable(),

  /**
    Whether there is a new version of the application's cache or not.

    This property is undefined until it can be determined that a new version exists
    or not.  Note that the new version may not necessarily be valid.  You
    should check isNewVersionValid after determining that hasNewVersion is
    true.

    @field
    @type Boolean
    @default undefined
    @readonly
    */
  hasNewVersion: function () {
    var ret,
      status = this.get('status');

    if (SC.platform.supportsApplicationCache) {
      if (status === window.applicationCache.UPDATEREADY ||
          status === window.applicationCache.OBSOLETE) {
        // It is only true if there is an update (which may have failed).
        ret = true;
      } else if (status === window.applicationCache.IDLE) {
        // It is only false if there was no update.
        ret = false;
      } // Else we don't know yet.
    } else {
      // The platform doesn't support it, so it must always be false.
      ret = false;
    }

    return ret;
  }.property('status').cacheable(),

  /**
    The interval in milliseconds to poll for updates when shouldPoll is true.

    @type Number
    @default 1800000 (30 minutes)
    */
  interval: 1800000,

  /**
    The progress of the application cache between 0.0 (0%) and 1.0 (100%).

    @type Number
    @default 0.0
    */
  progress: 0,

  /**
    Whether or not to regularly check for updates to the application cache
    while the application is running.

    This is useful for applications that are left open for several hours at a
    time, such as a SproutCore application being used in business.  In order to
    ensure that the users have the latest version, you can set this property
    to true to have the application regularly check for updates.

    Updates are run using the background task queue, so as to pose the smallest
    detriment possible to performance.

    @field
    @type Boolean
    @default false
    */
  shouldPoll: function (key, value) {
    if (SC.none(value)) {
      // Default value.
      value = false;
    } else if (value) {
      var status = this.get('status');
      if (status === window.applicationCache.IDLE) {
        // Start regularly polling for updates.
        this._timer = SC.Timer.schedule({
          target: this,
          action: '_checkForUpdates',
          interval: this.get('interval'),
          repeats: YES
        });
      } else {
        
        SC.warn('Developer Warning: Attempting to update the application cache should only be done when it is in an IDLE state.  Otherwise, the browser will throw an exception.  The current status is %@.'.fmt(status));
        
      }
    } else {
      // Stop any previous polling.
      if (this._timer) {
        this._timer.invalidate();
        this._timer = null;
        this._task = null;
      }
    }

    return value;
  }.property().cacheable(),

  /**
    The current window.applicationCache status.

    This is a KVO mapping of window.applicationCache.status.  Possible values
    are:

    * window.applicationCache.UNCACHED
    * window.applicationCache.IDLE
    * window.applicationCache.CHECKING
    * window.applicationCache.DOWNLOADING
    * window.applicationCache.UPDATEREADY
    * window.applicationCache.OBSOLETE

    Because of the various interpretations these statuses can mean, you will
    likely find it easier to use the helper properties on SC.appCache instead.

    @type Number
    @default 0
    */
  status: 0,

  // ------------------------------------------------------------------------
  // Methods
  //

  /** @private */
  _appCacheDidProgress: function (evt) {
    evt = evt.originalEvent;
    if (evt.lengthComputable) {
      this.set('progress', evt.loaded / evt.total);
    } else {
      this.set('progress', null);
    }
  },

  /** @private */
  _appCacheStatusDidChange: function () {
    var appCache = window.applicationCache,
      status;

    status = appCache.status;

    // Clear all previous event listeners.
    SC.Event.remove(appCache);
    switch (status) {
    case appCache.UNCACHED: // UNCACHED == 0
      break;
    case appCache.IDLE: // IDLE == 1
      this.set('progress', 1);
      break;
    case appCache.CHECKING: // CHECKING == 2
      SC.Event.add(appCache, 'downloading', this, '_appCacheStatusDidChange');
      SC.Event.add(appCache, 'noupdate', this, '_appCacheStatusDidChange');
      SC.Event.add(appCache, 'error', this, '_appCacheStatusDidChange');
      break;
    case appCache.DOWNLOADING: // DOWNLOADING == 3
      SC.Event.add(appCache, 'progress', this, '_appCacheDidProgress');
      SC.Event.add(appCache, 'cached', this, '_appCacheStatusDidChange');
      SC.Event.add(appCache, 'updateready', this, '_appCacheStatusDidChange');
      SC.Event.add(appCache, 'error', this, '_appCacheStatusDidChange');
      break;
    case appCache.UPDATEREADY:  // UPDATEREADY == 4
      break;
    case appCache.OBSOLETE: // OBSOLETE == 5
      break;
    default:
      SC.error('Unknown application cache status: %@'.fmt(appCache.status));
      break;
    }

    // Update our status.
    this.set('status', status);
  },

  /** @private Adds a task to check for application updates to the background task queue. */
  _checkForUpdates: function () {
    var task = this._task;

    if (this.get('status') === window.applicationCache.IDLE) {
      if (!task) { task = this._task = SC.AppCacheTask.create(); }
      SC.backgroundTaskQueue.push(task);
    } else {
      // Stop polling if the status isn't IDLE.
      this.set('shouldPoll', false);
    }
  },

  /** @private */
  init: function () {
    arguments.callee.base.apply(this,arguments);

    if (SC.platform.supportsApplicationCache) {
      // By the time that this object is created, we may have already passed
      // out of the CHECKING state, but _appCacheStatusDidChange() will take care of it.
      this._appCacheStatusDidChange();
    } else {
      SC.warn('Unable to use SC.appCache, the browser does not support the application cache.');
    }
  }

});

/* >>>>>>>>>> BEGIN source/system/benchmark.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals $A */

sc_require('core') ;

/** @namespace

  This bit of meta-programming magic can install a benchmark handler on any
  object method.  When a benchmark is installed, the time required to execute
  the method will be printed to the console log every time the method is
  called.

  This class can be used to implement benchmarking.  To use this object, just
  call start() with a key name and end() with a keyname.  The benchmark will
  be logged.  If you set verbose = true, then benchmark will log every time it
  saves a bench.  Otherwise, it just keeps stats.  You can get the stats by
  calling report().

  Benchmark does not require anything other than the date.js class.  It also
  does not rely on SC.Object so that you can benchmark code in that area as
  well.

  The benchmark has three types of reports.

    - report(): Returns an abbreviated list with just the durations of the bench.
              Also, it averages multiple runs. Everything is reported on the top
              level only.
    - timelineReport(): Returns an list of benchmarks and sub-benchmarks. If the
                      the globalStartTime is set, then it will show relative
                      time from that time.
    - timelineChart(): Displays a chart of all the benchmarks (not sub-benchmarks)
                     relative to the first time capture or to the globalStartTime.
                     Hide this by calling hideChart()

  @since SproutCore 1.0
*/
SC.Benchmark = {

  /**
    If true, then benchmarks will be logged to the console as they are
    recorded.

    @type Boolean
    @default NO
  */
  verbose: NO,

  /**
    If false, benchmarking will be disabled.  You might want to disable this
    during production to maximize performance.

    @type Boolean
    @default YES
  */
  enabled: YES,

  /**
    Events are a way of assigning specific, individual times to names, rather than
    durations of time. A benchmark event can only occur once—if it occurs again, it
    will overwrite the old event.

    The purpose of events is different than the purpose for normal benchmarks. Normal
    benchmarks may be used to benchmark a specific process, and may do so repeatedly;
    events, conversely, are usually used to benchmark things like startup time, and
    occur only once. For instance, an 'event' is registered when the document is ready.

    Events are kept as a hash of names to timestamps. To add an event, just set it:

        SC.Benchmark.events['myEventName'] = new Date().getTime();

        // Or, more conveniently:
        SC.Benchmark.addEvent('myEventName', [optional time]);

    On a timeline chart, events are usually represented as lines rather than bars. However,
    if you add eventNameStart and eventNameEnd, they will be automatically added as standard
    benchmarks.

    This is useful when adding preload events to SC.benchmarkPreloadEvents; as SC.Benchmark
    does not yet exist, you cannot call .start() and .end(), but adding the items to
    SC.benchmarkPreloadEvents will ensure they are included.

    @type Hash
    @default {}
  */
  events: {},

  /**
    This hash stores collected stats.  It contains key value pairs.  The value
    will be a hash with the following properties:

      - *runs*: the number of times this stat has run
      - *amt*: the total time consumed by this (divide by runs to get avg)
      - *name*: an optional longer name you assigned to the stat key.  Set this  using name().

    @type Hash
    @default {}
  */
  stats: {},

  /**
    If set, one can tell when the benchmark is started relatively to the global start time.

    This property is set to a default automatically (from HTML5 NavigationTiming if possible,
    otherwise the SC bootstrap).

    @type Number
    @default null
  */
  globalStartTime: null,

  /**
    Adds an 'event' to the events hash.

    Unlike normal benchmarks, recorded with start/end and that represent a block of time,
    events represent a single instance in time. Further, unlike normal benchmarks, which
    may be run more than once for the same benchmark name, only one instance in time
    will be recorded for any event name.

    @param {String} name
      A name that identifies the event. If addEvent is called again with the same name,
      the previous call's timestamp will be overwritten.
    @param {Timestamp} time
      Optional. The timestamp to record for the event.
  */
  addEvent: function(name, time) {
    if (!time) time = new Date().getTime();
    this.events[name] = time;
  },

  /**
    Call this method at the start of whatever you want to collect.
    If a parentKey is passed, then you will attach the stat to the parent,
    otherwise it will be on the top level. If topLevelOnly is passed, then
    recursive calls to the start will be ignored and only the top level call
    will be benchmarked.

    @param {String} key
      A unique key that identifies this benchmark.  All calls to start/end
      with the same key will be groups together.
    @param {String} parentKey
      A unique key that identifies the parent benchmark.  All calls to
      start/end with the same key will be groups together.
    @param {Boolean} topLevelOnly
      If true then recursive calls to this method with the same key will be
      ignored.
    @param {Number} time
      Only pass if you want to explicitly set the start time.  Otherwise the
      start time is now.
    @returns {String} the passed key
  */
  start: function(key, parentKey, time, topLevelOnly) {
    if (!this.enabled) return ;

    var start = (time || Date.now()), stat;

    if (parentKey) stat = this._subStatFor(key, parentKey) ;
    else stat = this._statFor(key) ;

    if (topLevelOnly && stat._starts.length > 0) stat._starts.push('ignore');
    else stat._starts.push(start) ;

    stat._times.push({start: start, _subStats: {}});
    return key;
  },

  /**
    Call this method at the end of whatever you want to collect.  This will
    save the collected benchmark.

    @param {String} key
      The benchmark key you used when you called start()
    @param {String} parentKey
      The benchmark parent key you used when you called start()
    @param {Number} time
      Only pass if you want to explicitly set the end time.  Otherwise start
      time is now.
  */
  end: function(key, parentKey, time) {
    var stat;
    if (!this.enabled) return ;
    if(parentKey)
    {
      stat = this._subStatFor(key, parentKey) ;
    }
    else
    {
      stat = this._statFor(key) ;
    }
    var start = stat._starts.pop() ;
    if (!start) {
      SC.Logger.log('SC.Benchmark "%@" ended without a matching start.  No information was saved.'.fmt(key));
      return ;
    }

    // top level only.
    if (start == 'ignore') return ;

    var end = (time || Date.now()) ;
    var dur = end - start;

    stat._times[stat._times.length-1].end = end;
    stat._times[stat._times.length-1].dur = dur;

    stat.amt += dur ;
    stat.runs++ ;

    if (this.verbose) this.log(key) ;
  },

  /*
    Set the inital global start time.
  */
  setGlobalStartTime: function(time)
  {
    this.globalStartTime = time;
  },

  /**
    This is a simple way to benchmark a function.  The function will be
    run with the name you provide the number of times you indicate.  Only the
    function is a required param.
  */
  bench: function(func, key, reps) {
    if (!key) key = "bench%@".fmt(this._benchCount++) ;
    if (!reps) reps = 1 ;
    var ret ;

    while(--reps >= 0) {
      var timeKey = SC.Benchmark.start(key) ;
      ret = func();
      SC.Benchmark.end(timeKey) ;
    }

    return ret ;
  },

  /**
    This bit of metaprogramming magic install a wrapper around a method and
    benchmark it whenever it is run.
  */
  install: function(object,method, topLevelOnly) {
    // vae the original method.
    object['b__' + method] = object[method] ;
    var __func = object['b__' + method];

    // replace with this helper.
    object[method] = function() {
      var key = '%@(%@)'.fmt(method, $A(arguments).join(', ')) ;
      SC.Benchmark.start(key, topLevelOnly) ;
      var ret = __func.apply(this, arguments) ;
      SC.Benchmark.end(key) ;
      return ret ;
    } ;
  },

  /**
    Restore the original method, deactivating the benchmark.

    @param {Object} object the object to change
    @param {String} method the method name as a string.
  */
  restore: function(object,method) {
    object[method] = object['b__' + method] ;
  },

  /**
    This method will return a string containing a report of the stats
    collected so far.  If you pass a key, only the stats for that key will
    be returned.  Otherwise, all keys will be used.
  */
  report: function(key) {
    if (key) return this._genReport(key) ;
    var ret = [] ;
    for(var k in this.stats) {
      if (!this.stats.hasOwnProperty(k)) continue ;
      ret.push(this._genReport(k)) ;
    }
    return ret.join("\n") ;
  },

  /**
    Generate a human readable benchmark report. Pass in appName if you desire.

    @param {String} application name.
  */
  timelineReport: function(appName) {
    appName = (appName) ? 'SproutCore Application' : appName;
    var ret = [appName, 'User-Agent: %@'.fmt(navigator.userAgent), 'Report Generated: %@ (%@)'.fmt(new Date().toString(), Date.now()), ''] ;

    var chart = this._compileChartData(true);
    for(var i=0; i<chart.length; i++)
    {
      if(chart[i][4])
      {
        ret.push(this._timelineGenSubReport(chart[i]));
      }
      else
      {
        ret.push(this._timelineGenReport(chart[i]));
      }
    }
    return ret.join("\n") ;
  },

  /**
    Returns a hash containing the HTML representing the timeline chart, and
    various metrics and information about the chart:

        - html
        - totalWidth
        - totalHeight
        - totalCapturedTime
        - pointsCaptured

    @returns {Hash}
  */
  getTimelineChartContent: function() {
    // Compile the data.
    var chart = this._compileChartData(false);
    var chartLen = chart.length;

    // Return if there is nothing to draw.
    if(chartLen === 0) return;

    // Get the global start of the graph.
    var gStart = this.globalStartTime ? this.globalStartTime : chart[0][1];
    var maxDur = chart[chartLen-1][2]-gStart;
    var maxHeight = 25+chartLen*30;
    var incr = Math.ceil(maxDur/200)+1;
    var maxWidth = incr*50;
    var leftPadding = 10, rightPadding = 300;


    var str = "<div class = 'sc-benchmark-timeline-chart' style = 'position:relative;'>";
    str += "<div class = 'sc-benchmark-top'></div>";

    // add tick marks
    for (var i = 0; i < incr; i++) {
      str += "<div class = 'sc-benchmark-tick' style = '";
      str += "left: " + (leftPadding + i * 50) + "px; ";
      str += "height: " + maxHeight + "px;";
      str += "'></div>";

      str += "<div class = 'sc-benchmark-tick-label' style = '";
      str += "left: " + (leftPadding + i * 50) + "px; ";
      str += "'>" + (i * 200) + "ms</div>";
    }

    // print each chart item
    for (i = 0; i < chartLen; i++) {
      str += "<div class = 'sc-benchmark-row ";
      str += (i % 2 === 0) ? 'even' : 'odd';
      str += "' style = '";
      str += "top: " + (50 + (i * 30)) + "px; ";
      str += "'></div>";

      var div = document.createElement('div');
      var start = chart[i][1];
      var end = chart[i][2];
      var duration = chart[i][3];


      str += "<div class = 'sc-benchmark-bar' style = '";
      str += 'left:'+ (leftPadding + ((start-gStart)/4))+'px; width: '+((duration/4)) + 'px;';
      str += 'top: '+(28+(i*30))+'px;';

      str += "' title = 'start: " + (start-gStart) + " ms, end: " + (end-gStart) + ' ms, duration: ' + duration + " ms'";
      str += ">";
      str += '&nbsp;' + chart[i][0] + " <span class='sc-benchmark-emphasis'>";
      str += duration + "ms (start: " + (start - gStart) + "ms)";
      str += "</span>";

      str += "</div>";
    }

    // add the events
    var events = this.events, idx = 0;
    for (i in events) {
      var t = events[i] - gStart;
      str += "<div class = 'sc-benchmark-event idx" + (idx % 10) + "' style = '";
      str += "left: " + (leftPadding + t / 4) + "px; height: " + maxHeight + "px; top: 20px;";
      str += "' title = '" + i + ": " + t + "'></div>";
      idx++;
    }

    str += "</div>";

    return {
      html: str,
      totalCapturedTime: maxDur,
      pointsCaptured: chartLen,
      width: maxWidth + leftPadding + rightPadding,
      height: maxHeight
    };
  },

  /**
    Returns a view with the timeline chart. The view has a 'reload' method to
    refresh its data.

    @returns {SC.View}
  */
  getTimelineChartView: function() {
    var view = SC.ScrollView.create({
      contentView: SC.StaticContentView.extend({

      }),

      reload: function() {
        var content = SC.Benchmark.getTimelineChartContent();
        this.contentView.set('content', content.html);
        this.contentView.adjust({
          width: content.width,
          height: content.height
        });

        this.chartContent = content;

        SC.RunLoop.invokeLater(SC.Benchmark, function() {
          this.contentView.notifyPropertyChange('frame');
        });
      }
    });

    view.reload();

    return view;
  },

  /**
    Generate a human readable benchmark chart. Pass in appName if you desire.
  */
  timelineChart: function(appName) {
    SC.RunLoop.begin();

    var i=0;
    // Hide the chart if there is an existing one.
    this.hideChart();

    // Compile the data.
    var chartView = this.getTimelineChartView();
    var chartLen = chartView.chartContent.pointsCaptured,
        chartCapturedTime = chartView.chartContent.totalCapturedTime;

    // Get the global start of the graph.

    this._benchmarkChart = SC.Pane.create({
      classNames: ["sc-benchmark-pane"],
      layout: { left: 20, right: 20, bottom: 20, top: 20 },
      childViews: ["title", "exit"],
      exit: SC.ButtonView.extend({
        layout: { right: 20, top: 20, width: 100, height: 30 },
        title: "Hide Chart",
        target: this,
        action: "hideChart"
      }),

      title: SC.LabelView.extend({
        classNames: ['sc-benchmark-title'],
        layout: { left: 20, top: 23, right: 200, height: 30 },
        value: ((appName) ? appName : 'SproutCore Application') + (' - Total Captured Time: ' + chartCapturedTime +' ms - Points Captured: ' + chartLen)
      })

    }).append();

    chartView.set('layout', { left: 20, top: 60, bottom: 20, right: 20 });
    this._benchmarkChart.appendChild(chartView);

    SC.RunLoop.end();
  },

  /*
    Hide chart.
  */
  hideChart: function() {
    if (this._benchmarkChart) {
      this._benchmarkChart.remove();
      this._benchmarkChart = null;
    }

    return YES;
  },

  /** @private
    Because we show a pane to display the chart...
  */
  tryToPerform: function(action, sender) {
    if (this[action]) return this[action](sender);
    return NO;
  },

  /**
    This method is just like report() except that it will log the results to
    the console.
  */
  log: function(key) {
    // log each line to make this easier to read on an iPad
    var lines = this.report(key).split('\n'),
        len   = lines.length, idx;
    for(idx=0;idx<len;idx++) SC.Logger.log(lines[idx]);
  },

  /**
    This will activate profiling if you have Firebug installed.  Otherwise
    does nothing.
  */
  startProfile: function(key) {
    if (!this.enabled) return ;
    SC.Logger.profile(key) ;
  },

  endProfile: function(key) {
    if (!this.enabled) return ;
    SC.Logger.profileEnd(key) ;
  },


  // ..........................................................
  // Internal Support
  //

  /** @private
    Loads data from both the browser's own event hash and SC's pre-load event hash.
  */
  loadPreloadEvents: function() {
    var preloadEvents = SC.benchmarkPreloadEvents, events = [], idx, len, evt;

    // the browsers may have their own event hash. Ours uses the same format, so
    // all that we need to do is mixin the browser's to our own.
    if (typeof webkitPerformnce !== 'undefined') SC.mixin(preloadEvents, webkitPerformane.timing);

    // we will attempt to find when the loading started and use that as our
    // global start time, but only do so if the global start time is not already set.
    if (!this.globalStartTime) {
      // the potential events representing start time can be either from the browser
      // or our own recordings. We prefer the browser.
      var globalStartEvents = ['navigation', 'navigationStart', 'headStart'];
      len = globalStartEvents.length;

      for (idx = 0; idx < len; idx++) {
        if (preloadEvents[globalStartEvents[idx]]) {
          this.globalStartTime = preloadEvents[globalStartEvents[idx]];
          break;
        }
      }
    }

    // the JavaScript start time will be one recorded by us
    // we record headStart in bootstrap.
    this.javascriptStartTime = preloadEvents['headStart'];

    // finally, mix in the events to our own events hash
    SC.mixin(this.events, preloadEvents);

    this._hasLoadedPreloadEvents = true;
  },

  /** @private
    Some events represent a beginning and end. While this is not common for events
    that take place after the app loads (as they can just use SC.Benchmark.start/end),
    SC.Benchmark.start/end is not available before load—as such, code will add
    *Start and *End events to the event hash.

    This method iterates over the event hash and removes those items that represent
    starts and ends, calling .start/.end for them.
  */
  _loadBenchmarksFromEvents: function() {
    if (!this._hasLoadedPreloadEvents) this.loadPreloadEvents();

    var events = this.events;
    for (var i in events) {
      if (i.substr(-3) !== 'End') continue;

      var stem = i.substr(0, i.length - 3);
      if (!events[stem + 'Start']) continue;

      SC.Benchmark.start(stem, undefined, events[stem + 'Start']);
      SC.Benchmark.end(stem, undefined, events[stem + 'End']);

      delete events[stem + 'Start'];
      delete events[stem + 'End'];
    }
  },

  /** @private
    Generates, sorts, and returns the array of all the data that has been captured.
  */
  _compileChartData: function(showSub) {
    this._loadBenchmarksFromEvents();

    var chart = [], dispKey;
    for(var key in this.stats)
    {
      var stat = this.stats[key];
      for(var i=0; i<stat._times.length; i++)
      {
        var st = stat._times[i];
        dispKey = (stat._times.length > 1) ? (i+1)+' - '+key : key;
        chart.push([dispKey, st.start, st.end, st.dur, false]);
        if(showSub)
        {
          var subStats = st._subStats;
          for(var k in subStats)
          {

            var subStat = subStats[k];
            for(var j=0; j<subStat._times.length; j++)
            {
              var s = subStat._times[j];
              dispKey = (subStat._times.length > 1) ? (j+1)+' - '+k : k;
              chart.push([dispKey, s.start, s.end, s.dur, true]);

            }
          }
        }
      }
    }

    chart.sort(function(a,b)
    {
      if(a[1] < b[1])
      {
        return -1;
      }
      else if(a[1] == b[1])
      {
        if(a[3] && !b[3]) return -1;
        if(!a[3] && b[3]) return 1;
        return 0;
      }
      return 1;
    });

    return chart;
  },

  // Generate the traditional report show multiple runs averaged.
  /** @private */
  _genReport: function(key) {
    var stat = this._statFor(key) ;
    var avg = (stat.runs > 0) ? (Math.floor(stat.amt * 1000 / stat.runs) / 1000) : 0 ;
    var last = stat._times[stat._times.length - 1];

    return 'BENCH %@ msec: %@ (%@x); latest: %@'.fmt(avg, (stat.name || key), stat.runs, last.end - last.start);
  },

  // Generate the report in the form of at time line. This returns the parent.
  /** @private */
  _timelineGenReport: function(val)
  {
    if(this.globalStartTime)
    {
      return 'BENCH start: %@ msec, duration: %@ msec,  %@'.fmt((val[1]-this.globalStartTime), val[3], val[0]) ;
    }
    else
    {
      return 'BENCH duration: %@ msec, %@'.fmt( val[3],  val[0]) ;
    }
  },

  // Generate the report in the form of at time line. This returns the children.
  /** @private */
  _timelineGenSubReport: function(val)
  {
    if(this.globalStartTime)
    {
      return '   CHECKPOINT BENCH start: %@ msec, duration: %@ msec,  %@'.fmt((val[1]-this.globalStartTime), val[3], val[0]) ;
    }
    else
    {
      return '   CHECKPOINT BENCH duration: %@ msec, %@'.fmt( val[3], val[0]) ;
    }
  },

  // returns a stats hash for the named key and parent key.  If the hash does not exist yet,
  // creates it.
  /** @private */
  _subStatFor: function(key, parentKey) {
    var parentTimeLen = this.stats[parentKey]._times.length;
    if(parentTimeLen === 0) return;
    var parentSubStats = this.stats[parentKey]._times[this.stats[parentKey]._times.length-1]._subStats;
    var ret = parentSubStats[key] ;
    if (!ret) {
      parentSubStats[key] = {
        runs: 0, amt: 0, name: key, _starts: [], _times: []
      };
      ret = parentSubStats[key];
    }
    return ret ;
  },

  // returns a stats hash for the named key.  If the hash does not exist yet,
  // creates it.
  /** @private */
  _statFor: function(key) {
    var ret = this.stats[key] ;
    if (!ret) {
      ret = this.stats[key] = {
        runs: 0, amt: 0, name: key, _starts: [], _times: []
      };
      ret = this.stats[key];
    }
    return ret ;
  },

  /** @private */
  reset: function() { this.stats = {} ; },

  // This is private, but it is used in some places, so we are keeping this for
  // compatibility.
  /** @private */
  _bench: function(func, name) {
    SC.Benchmark.bench(func, name, 1) ;
  },

  /** @private */
  _benchCount: 1

} ;

SC.Benchmark = SC.Benchmark;

/* >>>>>>>>>> BEGIN source/system/cookie.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


/** @class

  Allows for easier handling of the document.cookie object. To create a cookie,
  simply call SC.Cookie.create. To retrieve a cookie, use SC.Cookie.find.
  Cookies are not added to document.cookie, which SC.Cookie.find uses, until you
  have called SC.Cookie#write.

  Heavy inspiration from the
  {@link <a href="http://plugins.jquery.com/project/cookie">jQuery cookie plugin</a>}.

  @extends SC.Object
  @since Sproutcore 1.0
  @author Colin Campbell
*/

SC.Cookie = SC.Object.extend(
/** @scope SC.Cookie.prototype */{

  // ..........................................................
  // PROPERTIES
  //

  /**
    @type String
    @default null
  */
  name: null,

  /**
    @type String
    @default ''
  */
  value: '',

  /**
    Amount of time until the cookie expires. Set to -1 in order to delete the cookie.

    If passing an Integer, it is interpreted as a number of days.

    @type Integer|SC.DateTime|Date
    @default null
  */
  expires: null,

  /**
    @type String
    @deafult null
  */
  path: null,

  /**
    @type String
    @default null
  */
  domain: null,

  /**
    If true, the secure attribute of the cookie will be set and the cookie transmission will
    require a secure protocol (like HTTPS).

    @type Boolean
    @default NO
  */
  secure: NO,

  /**
    Walk like a duck

    @type Boolean
    @default YES
    @readOnly
  */
  isCookie: YES,


  // ..........................................................
  // METHODS
  //

  /**
    Sets SC.Cookie#expires to -1, which destroys the cookie.
  */
  destroy: function() {
    this.set('expires', -1);
    this.write();

    arguments.callee.base.apply(this,arguments);
  },

  /**
    Writes this SC.Cookie to document.cookie and adds it to SC.Cookie collection. To find this
    cookie later, or on reload, use SC.Cookie.find.

    @see SC.Cookie.find
  */
  write: function() {
    var name = this.get('name'),
        value = this.get('value'),
        expires = this.get('expires'),
        path = this.get('path'),
        domain = this.get('domain'),
        secure = this.get('secure'),
        output = '',
        date;

    if (expires) {
      if (typeof expires === SC.T_NUMBER) {
        date = new Date();
        date.setTime(date.getTime() + (expires*24*60*60*1000));
      } else if (SC.DateTime && expires.get && expires.get('milliseconds')) {
        date = new Date(expires.get('milliseconds'));
      } else if (expires.toUTCString && expires.toUTCString.apply) {
        date = expires;
      }

      if (date) output = "; expires=" + date.toUTCString();
    }

    if (!SC.none(path)) output += '; path=' + path;
    if (!SC.none(domain)) output += '; domain=' + domain;
    if (secure === YES) output += '; secure';

    document.cookie = name + "=" + encodeURIComponent(value) + output;

    return this;
  }

});

SC.Cookie.mixin(
  /** @scope SC.Cookie */ {

  /**
    Finds a cookie that has been stored

    @param {String} name The name of the cookie
    @returns SC.Cookie object containing name and value of cookie
  */
  find: function(name) {
    if (document.cookie && document.cookie !== '') {
      var cookies = document.cookie.split(';');
      for (var i = 0; i < cookies.length; i++) {
        var cookie = SC.String.trim(String(cookies[i]));
        if (cookie.substring(0, name.length + 1) === (name + "=")) {
          return SC.Cookie.create({
            name: name,
            value: decodeURIComponent(cookie.substring(name.length + 1))
          });
        }
      }
    }
    return null;
  }

});

SC.CookieMonster = {
  nomNomNom: function(cookie) {
    var isCookie = SC.kindOf(cookie, SC.Cookie);
    if (isCookie) {
      SC.Logger.log("YUM!");
      return cookie.destroy();
    }
    
    SC.Logger.error("Y U PASS ME NO COOKIE? %@", cookie);
    return NO;
  }
};
/* >>>>>>>>>> BEGIN source/system/core_query.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

 SC.mixin(SC.$.fn, /** @scope SC.$.prototype */ {

  /**
    You can either pass a single class name and a boolean indicating whether
    the value should be added or removed, or you can pass a hash with all
    the class names you want to add or remove with a boolean indicating
    whether they should be there or not.

    This is far more efficient than using addClass/removeClass.

    @param {String|Hash} className class name or hash of classNames + bools
    @param {Boolean} shouldAdd for class name if a string was passed
    @returns {SC.CoreQuery} receiver
  */
  setClass: function(className, shouldAdd) {
    if (SC.none(className)) { return this; } //nothing to do
    var isHash = SC.typeOf(className) !== SC.T_STRING,
        fix = this._fixupClass, key;

    this.each(function() {
      if (this.nodeType !== 1) { return; } // nothing to do

      // collect the class name from the element and build an array
      var classNames = this.className.split(/\s+/), didChange = NO;

      // loop through hash or just fix single className
      if (isHash) {
        for(var key in className) {
          if (className.hasOwnProperty(key)) {
            didChange = fix(classNames, key, className[key]) || didChange;
          }
        }
      } else {
        didChange = fix(classNames, className, shouldAdd);
      }

      // if classNames were changed, join them and set...
      if (didChange) { this.className = classNames.join(' '); }
    });
    return this ;
  },

  /** @private used by setClass */
  _fixupClass: function(classNames, name, shouldAdd) {
    var indexOf = classNames.indexOf(name);
    // if should add, add class...
    if (shouldAdd) {
      if (indexOf < 0) { classNames.push(name); return YES ; }

    // otherwise, null out class name (this will leave some extra spaces)
    } else if (indexOf >= 0) { classNames[indexOf]=null; return YES; }
    return NO ;
  }


});

/* >>>>>>>>>> BEGIN source/system/exception_handler.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/**
  @namespace

  If an exception is thrown during execution of your SproutCore app, this
  object will be given the opportunity to handle it.

  By default, a simple error message is displayed prompting the user to
  reload. You could override the handleException method to, for example, send
  an XHR to your servers so you can collect information about crashes in your
  application.

  Since the application is in an unknown state when an exception is thrown, we
  rely on JavaScript and DOM manipulation to generate the error instead of
  using SproutCore views.

  @since SproutCore 1.5
*/
SC.ExceptionHandler = {

  /** @private */
  enabled: (SC.buildMode !== 'debug'),

  /**
    Called when an exception is encountered by code executed using SC.run().

    By default, this will display an error dialog to the user. If you
    want more sophisticated behavior, override this method.

    @param {Exception} exception the exception thrown during execution
  */
  handleException: function(exception) {
    if (this.isShowingErrorDialog) return NO;
    
    this._displayErrorDialog(exception);
    
    return NO;
  },

  /** @private
    Creates the error dialog and appends it to the DOM.

    @param {Exception} exception the exception to display
  */
  _displayErrorDialog: function(exception) {
    var html = this._errorDialogHTMLForException(exception),
        node = document.createElement('div');

    node.style.cssText = "left: 0px; right: 0px; top: 0px; bottom: 0px; position: absolute; background-color: white; background-color: rgba(255,255,255,0.6); z-index:100;";
    node.innerHTML = html;

    document.body.appendChild(node);

    this.isShowingErrorDialog = YES;
  },

  /** @private
    Given an exception, returns the HTML for the error dialog.

    @param {Exception} exception the exception to display
    @returns {String}
  */
  _errorDialogHTMLForException: function(exception) {
    var html;

    html = [
'<div id="sc-error-dialog" style="position: absolute; width: 500px; left: 50%; top: 50%; margin-left: -250px; background-color: white; border: 1px solid black; font-family: Monaco, monospace; font-size: 9px; letter-spacing: 1px; padding: 10px">',
  'An error has occurred which prevents the application from running:',
  '<br><br>',
  exception.message,
  '<div id="sc-error-dialog-reload-button" onclick="window.location.reload();" style="float: right; font-family: Monaco, monospace; font-size: 9px; letter-spacing: 1px; border: 1px solid black; padding: 3px; clear: both; margin-top: 20px; cursor: pointer;">',
  'Reload',
  '</div>',
'</div>'
    ];

    return html.join('');
  },

  /**
    YES if an exception was thrown and the error dialog is visible.

    @type Boolean
    @default NO
  */
  isShowingErrorDialog: NO
};
/* >>>>>>>>>> BEGIN source/system/image_queue.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

SC.IMAGE_ABORTED_ERROR = SC.$error("SC.Image.AbortedError", "Image", -100) ;

SC.IMAGE_FAILED_ERROR = SC.$error("SC.Image.FailedError", "Image", -101) ;

/**
  @class
  
  The image queue can be used to control the order of loading images.
  
  Images queues are necessary because browsers impose strict limits on the 
  number of concurrent connections that can be open at any one time to any one 
  host. By controlling the order and timing of your loads using this image 
  queue, you can improve the percieved performance of your application by 
  ensuring the images you need most load first.
  
  Note that if you use the SC.ImageView class, it will use this image queue 
  for you automatically.
  
  ## Loading Images
  
  When you need to display an image, simply call the loadImage() method with 
  the URL of the image, along with a target/method callback. The signature of 
  your callback should be:
  
      imageDidLoad: function(imageUrl, imageOrError) {
        //...
      }

  The "imageOrError" parameter will contain either an image object or an error 
  object if the image could not be loaded for some reason.  If you receive an 
  error object, it will be one of SC.IMAGE_ABORTED_ERROR or 
  SC.IMAGE_FAILED_ERROR.
  
  You can also optionally specify that the image should be loaded in the 
  background.  Background images are loaded with a lower priority than 
  foreground images.
  
  ## Aborting Image Loads
  
  If you request an image load but then no longer require the image for some 
  reason, you should notify the imageQueue by calling the releaseImage() 
  method.  Pass the URL, target and method that you included in your original 
  loadImage() request.  
  
  If you have requested an image before, you should always call releaseImage() 
  when you are finished with it, even if the image has already loaded.  This 
  will allow the imageQueue to properly manage its own internal resources.
  
  This method may remove the image from the queue of images that need or load 
  or it may abort an image load in progress to make room for other images.  If 
  the image is already loaded, this method will have no effect.
  
  ## Reloading an Image
  
  If you have already loaded an image, the imageQueue will avoid loading the 
  image again.  However, if you need to force the imageQueue to reload the 
  image for some reason, you can do so by calling reloadImage(), passing the 
  URL.
  
  This will cause the image queue to attempt to load the image again the next 
  time you call loadImage on it.
  
  @extends SC.Object
  @since SproutCore 1.0
*/
SC.imageQueue = SC.Object.create(/** @scope SC.imageQueue.prototype */ {

  /**
    The maximum number of images that can load from a single hostname at any
    one time.  For most browsers 4 is a reasonable number, though you may 
    tweak this on a browser-by-browser basis.
  */
  loadLimit: 4,
  
  /**
    The number of currently active requests on the queue. 
  */
  activeRequests: 0,
  
  /**
    Loads an image from the server, calling your target/method when complete.
    
    You should always pass at least a URL and optionally a target/method.  If 
    you do not pass the target/method, the image will be loaded in background 
    priority.  Usually, however, you will want to pass a callback to be 
    notified when the image has loaded.  Your callback should have a signature 
    like:

        imageDidLoad: function(imageUrl, imageOrError) { .. }

    If you do pass a target/method you can optionally also choose to load the 
    image either in the foreground or in the background.  The imageQueue 
    prioritizes foreground images over background images.  This does not impact 
    how many images load at one time.
    
    @param {String} url
    @param {Object} target
    @param {String|Function} method
    @param {Boolean} isBackgroundFlag
    @returns {SC.imageQueue} receiver
  */
  loadImage: function(url, target, method, isBackgroundFlag) {
    // normalize params
    var type = SC.typeOf(target);
    if (SC.none(method) && SC.typeOf(target)===SC.T_FUNCTION) {
      target = null; method = target ;
    }
    if (SC.typeOf(method) === SC.T_STRING) {
      method = target[method];      
    }
    // if no callback is passed, assume background image.  otherwise, assume
    // foreground image.
    if (SC.none(isBackgroundFlag)) {
      isBackgroundFlag = SC.none(target) && SC.none(method);
    }
    
    // get image entry in queue.  If entry is loaded, just invoke callback
    // and quit.
    var entry = this._imageEntryFor(url) ;
    if (entry.status === this.IMAGE_LOADED) {
      if (method) method.call(target || entry.image, entry.url, entry.image);
      
    // otherwise, add to list of callbacks and queue image.
    } else {
      if (target || method) this._addCallback(entry, target, method);
      entry.retainCount++; // increment retain count, regardless of callback
      this._scheduleImageEntry(entry, isBackgroundFlag);
    }
  },
  
  /**
    Invoke this method when you are finished with an image URL.  If you 
    passed a target/method, you should also pass it here to remove it from
    the list of callbacks.
    
    @param {String} url
    @param {Object} target
    @param {String|Function} method
    @returns {SC.imageQueue} receiver
  */
  releaseImage: function(url, target, method) {
    // get entry.  if there is no entry, just return as there is nothing to 
    // do.
    var entry = this._imageEntryFor(url, NO) ;
    if (!entry) return this ;
    
    // there is an entry, decrement the retain count.  If <=0, delete!
    if (--entry.retainCount <= 0) {
      this._deleteEntry(entry); 
    
    // if >0, just remove target/method if passed
    } else if (target || method) {
      // normalize
      var type = SC.typeOf(target);
      if (SC.none(method) && SC.typeOf(target)===SC.T_FUNCTION) {
        target = null; method = target ;
      }
      if (SC.typeOf(method) === SC.T_STRING) {
        method = target[method];      
      }

      // and remove
      this._removeCallback(entry, target, method) ;
    }
  },

  /** 
    Forces the image to reload the next time you try to load it.
  */
  reloadImage: function(url) {
    var entry = this._imageEntryFor(url, NO); 
    if (entry && entry.status===this.IMAGE_LOADED) {
      entry.status = this.IMAGE_WAITING;
    }
  },
  
  /**
    Initiates a load of the next image in the image queue.  Normally you will
    not need to call this method yourself as it will be initiated 
    automatically when the queue becomes active.
  */
  loadNextImage: function() {
    var entry = null, queue;

    // only run if we don't have too many active request...
    if (this.get('activeRequests')>=this.get('loadLimit')) return; 
    
    // first look in foreground queue
    queue = this._foregroundQueue ;
    while(queue.length>0 && !entry) entry = queue.shift();
    
    // then look in background queue
    if (!entry) {
      queue = this._backgroundQueue ;
      while(queue.length>0 && !entry) entry = queue.shift();
    }
    this.set('isLoading', !!entry); // update isLoading...
    
    // if we have an entry, then initiate an image load with the proper 
    // callbacks.
    if (entry) {
      // var img = (entry.image = new Image()) ;
      var img = entry.image ;
      if(!img) return;

      // Using bind here instead of setting onabort/onerror/onload directly
      // fixes an issue with images having 0 width and height
      $(img).bind('abort', this._imageDidAbort);
      $(img).bind('error', this._imageDidError);
      $(img).bind('load', this._imageDidLoad);
      img.src = entry.url ;
      
      // add to loading queue.
      this._loading.push(entry) ;
    
      // increment active requests and start next request until queue is empty
      // or until load limit is reached.
      this.incrementProperty('activeRequests');
      this.loadNextImage();
    } 
  },
  
  // ..........................................................
  // SUPPORT METHODS
  // 

  /** @private Find or create an entry for the URL. */
  _imageEntryFor: function(url, createIfNeeded) {
    if (createIfNeeded === undefined) createIfNeeded = YES;
    var entry = this._images[url] ;
    if (!entry && createIfNeeded) {
      var img = new Image() ;
      entry = this._images[url] = { 
        url: url, status: this.IMAGE_WAITING, callbacks: [], retainCount: 0, image: img
      };
      img.entry = entry ; // provide a link back to the image
    } else if (entry && entry.image === null) {
    	// Ensure that if we retrieve an entry that it has an associated Image,
    	// since failed/aborted images will have had their image property nulled.
    	entry.image = new Image();
    	entry.image.entry = entry;
    }
    return entry ;
  },
  
  /** @private deletes an entry from the image queue, descheduling also */
  _deleteEntry: function(entry) {
    this._unscheduleImageEntry(entry) ;
    delete this._images[entry.url];    
  },
  
  /** @private 
    Add a callback to the image entry.  First search the callbacks to make
    sure this is only added once.
  */
  _addCallback: function(entry, target, method) {
    var callbacks = entry.callbacks;

    // try to find in existing array
    var handler = callbacks.find(function(x) {
      return x[0]===target && x[1]===method;
    }, this);
    
    // not found, add...
    if (!handler) callbacks.push([target, method]);
    callbacks = null; // avoid memory leaks
    return this ;
  },
  
  /** @private
    Removes a callback from the image entry.  Removing a callback just nulls
    out that position in the array.  It will be skipped when executing.
  */
  _removeCallback: function(entry, target, method) {
    var callbacks = entry.callbacks ;
    callbacks.forEach(function(x, idx) {
      if (x[0]===target && x[1]===method) callbacks[idx] = null;
    }, this);
    callbacks = null; // avoid memory leaks
    return this ;
  },
  
  /** @private 
    Adds an entry to the foreground or background queue to load.  If the 
    loader is not already running, start it as well.  If the entry is in the
    queue, but it is in the background queue, possibly move it to the
    foreground queue.
  */
  _scheduleImageEntry: function(entry, isBackgroundFlag) {

    var background = this._backgroundQueue ;
    var foreground = this._foregroundQueue ;
    
    // if entry is loaded, nothing to do...
    if (entry.status === this.IMAGE_LOADED) return this;

    // if image is already in background queue, but now needs to be
    // foreground, simply remove from background queue....
    if ((entry.status===this.IMAGE_QUEUED) && !isBackgroundFlag && entry.isBackground) {
      background[background.indexOf(entry)] = null ;
      entry.status = this.IMAGE_WAITING ;
    }
    
    // if image is not in queue already, add to queue.
    if (entry.status!==this.IMAGE_QUEUED) {
      var queue = (isBackgroundFlag) ? background : foreground ;
      queue.push(entry);
      entry.status = this.IMAGE_QUEUED ;
      entry.isBackground = isBackgroundFlag ;
    }
    
    // if the image loader is not already running, start it...
    if (!this.isLoading) this.invokeLater(this.loadNextImage, 100);
    this.set('isLoading', YES);
    
    return this ; // done!
  },
  
  /** @private
    Removes an entry from the foreground or background queue.  
  */
  _unscheduleImageEntry: function(entry) {
    // if entry is not queued, do nothing
    if (entry.status !== this.IMAGE_QUEUED) return this ;
    
    var queue = entry.isBackground ? this._backgroundQueue : this._foregroundQueue ;
    queue[queue.indexOf(entry)] = null; 
    
    // if entry is loading, abort it also.  Call local abort method in-case
    // browser decides not to follow up.
    if (this._loading.indexOf(entry) >= 0) {
      // In some cases queue.image is undefined. Is it ever defined?
      if (queue.image) queue.image.abort();
      this.imageStatusDidChange(entry, this.ABORTED);
    }
    
    return this ;
  },
  
  /** @private invoked by Image().  Note that this is the image instance */
  _imageDidAbort: function() {
    SC.run(function() {
      SC.imageQueue.imageStatusDidChange(this.entry, SC.imageQueue.ABORTED);
    }, this);
  },
  
  _imageDidError: function() {
    SC.run(function() {
      SC.imageQueue.imageStatusDidChange(this.entry, SC.imageQueue.ERROR);
    }, this);
  },
  
  _imageDidLoad: function() {
    SC.run(function() {
      SC.imageQueue.imageStatusDidChange(this.entry, SC.imageQueue.LOADED);
    }, this);
  },

  /** @private called whenever the image loading status changes.  Notifies
    items in the queue and then cleans up the entry.
  */
  imageStatusDidChange: function(entry, status) {
    if (!entry) return; // nothing to do...
    
    var url = entry.url ;
    
    // notify handlers.
    var value ;
    switch(status) {
      case this.LOADED:
        value = entry.image;
        break;
      case this.ABORTED:
        value = SC.IMAGE_ABORTED_ERROR;
        break;
      case this.ERROR:
        value = SC.IMAGE_FAILED_ERROR ;
        break;
      default:
        value = SC.IMAGE_FAILED_ERROR ;
        break;
    }
    entry.callbacks.forEach(function(x){
      var target = x[0], method = x[1];
      method.call(target, url, value);
    },this);
    
    // now clear callbacks so they aren't called again.
    entry.callbacks = [];
    
    // finally, if the image loaded OK, then set the status.  Otherwise
    // set it to waiting so that further attempts will load again
    entry.status = (status === this.LOADED) ? this.IMAGE_LOADED : this.IMAGE_WAITING ;
    
    // now cleanup image...
    var image = entry.image ;
    if (image) {
      image.onload = image.onerror = image.onabort = null ; // no more notices
      if (status !== this.LOADED) entry.image = null;
    }

    // remove from loading queue and periodically compact
    this._loading[this._loading.indexOf(entry)]=null;
    if (this._loading.length > this.loadLimit*2) {
      this._loading = this._loading.compact();
    }
    
    this.decrementProperty('activeRequests');
    this.loadNextImage() ;
  },
  
  init: function() {
    arguments.callee.base.apply(this,arguments);
    this._images = {};
    this._loading = [] ;
    this._foregroundQueue = [];
    this._backgroundQueue = [];
  },
  
  IMAGE_LOADED: "loaded",
  IMAGE_QUEUED: "queued",
  IMAGE_WAITING: "waiting",
  
  ABORTED: 'aborted',
  ERROR: 'error',
  LOADED: 'loaded'
});

/* >>>>>>>>>> BEGIN source/system/math.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/**
  @class
  
  Implements some enhancements to the built-in Number object that makes it
  easier to handle rounding and display of numbers.
  
  @since SproutCore 1.0
  @author Colin Campbell
*/
SC.Math = SC.Object.create(
/** @lends SC.Math.prototype */ {
  
  /**
    Checks to see if the number is near the supplied parameter to a certain lambda.
    
    @param {Number} n1 First number in comparison.
    @param {Number} n2 Number to compare against the first.
    @param {Number} lambda The closeness sufficient for a positive result. Default 0.00001
    @returns {Boolean}
  */
  near: function(n1, n2, lambda) {
    if (!lambda) lambda = 0.00001;
    return Math.abs(n1 - n2) <= lambda;
  },
  
  /**
    Rounds a number to a given decimal place. If a negative decimalPlace
    parameter is provided, the number will be rounded outward (ie. providing
    -3 will round to the thousands).
    
    Function is insufficient for high negative values of decimalPlace parameter.
    For example, (123456.789).round(-5) should evaluate to 100000 but instead
    evaluates to 99999.999... 
    
    @param {Number} n The number to round
    @param {Integer} decimalPlace
    @returns {Number}
  */
  round: function(n, decimalPlace) {
    if (!decimalPlace) decimalPlace = 0;
    var factor = Math.pow(10, decimalPlace);
    if (decimalPlace < 0) {
       // stop rounding errors from hurting the factor...
      var s = factor.toString();
      factor = s.substring(0, s.indexOf("1")+1);
    }
    n = n.valueOf();
    return Math.round(n * factor) / factor;
  }
  
}) ;

/* >>>>>>>>>> BEGIN source/system/module.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*globals jQuery */

sc_require('tasks/task');
SC.LOG_MODULE_LOADING = YES;

/**
  SC.Module is responsible for dynamically loading in JavaScript and other
  resources. These packages of code and resources, called bundles, can be
  loaded by your application once it has finished loading, allowing you to
  reduce the time taken for it to launch.

  You can explicitly load a module by calling SC.Module.loadModule(), or you
  can mark a module as prefetched in your Buildfile. In those cases,
  SproutCore will automatically start to load the bundle once the application
  has loaded and the user has remained idle for more than one second.
*/

SC.Module = SC.Object.create(/** @scope SC.Module */ {

  /**
    Returns YES if the module is ready; NO if it is not loaded or its
    dependencies have not yet loaded.

    @param {String} moduleName the name of the module to check
    @returns {Boolean}
  */
  isModuleReady: function (moduleName) {
    var moduleInfo = SC.MODULE_INFO[moduleName];
    return moduleInfo ? !!moduleInfo.isReady : NO;
  },

  /**
    Asynchronously loads a module if it is not already loaded. If you pass
    a function, or a target and action, it will be called once the module
    has finished loading.

    If the module you request has dependencies (as specified in the Buildfile)
    that are not yet loaded, it will load them first before executing the
    requested module.

    @param moduleName {String}
    @param target {Function}
    @param method {Function}
    @returns {Boolean} YES if already loaded, NO otherwise
  */
  loadModule: function (moduleName, target, method) {
    var module = SC.MODULE_INFO[moduleName], callbacks, targets,
        args   = SC.A(arguments).slice(3),
        log    = SC.LOG_MODULE_LOADING,
        idx, len;

    // Treat the first parameter as the callback if the target is a function and there is
    // no method supplied.
    if (method === undefined && SC.typeOf(target) === SC.T_FUNCTION) {
      method = target;
      target = null;
    }

    if (log) SC.debug("SC.Module: Attempting to load '%@'", moduleName);

    // If we couldn't find anything in the SC.MODULE_INFO hash, we don't have any record of the
    // requested module.
    if (!module) {
      throw new Error("SC.Module: could not find module '%@'".fmt(moduleName));
    }

    // If this module was in the middle of being prefetched, we now need to
    // execute it immediately when it loads.
    module.isPrefetching = NO;

    // If the module is already loaded, execute the callback immediately if SproutCore is loaded,
    // or else as soon as SC has finished loading.
    if (module.isLoaded && !module.isWaitingForRunLoop) {
      if (log) SC.debug("SC.Module: Module '%@' already loaded.", moduleName);

      // we can't just eval it if its dependencies have not been met...
      if (!this._dependenciesMetForModule(moduleName)) {
        // we can't let it return normally here, because we need the module to wait until the end of the run loop.
        // This is because the module may set up bindings.
        this._addCallbackForModule(moduleName, target, method, args);

        this._loadDependenciesForModule(moduleName);

        return NO;
      }

      // If the module has finished loading and we have the string
      // representation, try to evaluate it now.
      if (module.source) {
        if (log) SC.debug("SC.Module: Evaluating JavaScript for module '%@'.", moduleName);
        this._evaluateStringLoadedModule(module);

        // we can't let it return normally here, because we need the module to wait until the end of the run loop.
        // This is because the module may set up bindings.
        this._addCallbackForModule(moduleName, target, method, args);

        this.invokeLast(function () {
          module.isReady = YES;
          this._moduleDidBecomeReady(moduleName);
        });

        return NO;
      }

      if (method) {
        if (SC.isReady) {
          SC.Module._invokeCallback(moduleName, target, method, args);
        } else {
          // Queue callback for when SC has finished loading.
          SC.ready(SC.Module, function () {
            SC.Module._invokeCallback(moduleName, target, method, args);
          });
        }
      }

      return YES;
    }

    // The module has loaded, but is waiting for the end of the run loop before it is "ready";
    // we just need to add the callback.
    else if (module.isWaitingForRunLoop) {
      this._addCallbackForModule(moduleName, target, method, args);
    }
    // The module is not yet loaded, so register the callback and, if necessary, begin loading
    // the code.
    else {
      if (log) SC.debug("SC.Module: Module '%@' is not loaded, loading now.", moduleName);

      // If this method is called more than once for the same module before it is finished
      // loading, we might have multiple callbacks that need to be executed once it loads.
      this._addCallbackForModule(moduleName, target, method, args);

      // If this is the first time the module has been requested, determine its dependencies
      // and begin loading them as well as the JavaScript for this module.
      if (!module.isLoading) {
        this._loadDependenciesForModule(moduleName);
        this._loadCSSForModule(moduleName);
        this._loadJavaScriptForModule(moduleName);
        module.isLoading = YES;
      }

      return NO;
    }
  },

  _addCallbackForModule: function (moduleName, target, method, args) {
    var module = SC.MODULE_INFO[moduleName];

    // Retrieve array of callbacks from MODULE_INFO hash.
    var callbacks = module.callbacks || [];

    if (method) {
      callbacks.push(function () {
        SC.Module._invokeCallback(moduleName, target, method, args);
      });
    }

    module.callbacks = callbacks;
  },

  /**
    @private

    Loads a module in string form. If you prefetch a module, its source will
    be held as a string in memory until SC.Module.loadModule() is called, at
    which time its JavaScript will be evaluated.

    You shouldn't call this method directly; instead, mark modules as
    prefetched in your Buildfile. SproutCore will automatically prefetch those
    modules once your application has loaded and the user is idle.

    @param {String} moduleName the name of the module to prefetch
  */
  prefetchModule: function (moduleName) {
    var module = SC.MODULE_INFO[moduleName];

    if (module.isLoading || module.isLoaded) return;

    if (SC.LOG_MODULE_LOADING) SC.debug("SC.Module: Prefetching module '%@'.", moduleName);
    this._loadDependenciesForModule(moduleName);
    this._loadCSSForModule(moduleName);
    this._loadJavaScriptForModule(moduleName);
    module.isLoading = YES;
    module.isPrefetching = YES;
  },

  // ..........................................................
  // INTERNAL SUPPORT
  //

  /** @private
    If a module is marked for lazy instantiation, this method will execute the closure and call
    any registered callbacks.
  */
  _executeLazilyInstantiatedModule: function (moduleName, targetName, methodName) {
    var lazyInfo =  SC.LAZY_INSTANTIATION[moduleName];
    var target;
    var method;
    var idx, len;

    if (SC.LOG_MODULE_LOADING) {
      SC.debug("SC.Module: Module '%@' is marked for lazy instantiation, instantiating it now…", moduleName);
    }

    len = lazyInfo.length;
    for (idx = 0; idx < len; idx++) {
      // Iterate through each function associated with this module, and attempt to execute it.
      try {
        lazyInfo[idx]();
      } catch (e) {
        SC.Logger.error("SC.Module: Failed to lazily instatiate entry for  '%@'".fmt(moduleName));
      }
    }

    // Free up memory containing the functions once they have been executed.
    delete SC.LAZY_INSTANTIATION[moduleName];

    // Now that we have executed the functions, try to find the target and action for the callback.
    target = this._targetForTargetName(targetName);
    method = this._methodForMethodNameInTarget(methodName, target);

    if (!method) {
      throw new Error("SC.Module: could not find callback for lazily instantiated module '%@'".fmt(moduleName));
    }
  },

  /**
    Evaluates a module's JavaScript if it is stored in string format, then
    deletes that code from memory.

    @param {Hash} module the module to evaluate
  */
  _evaluateStringLoadedModule: function (module) {
    var moduleSource = module.source;

    // so, force a run loop.
    jQuery.globalEval(moduleSource);

    delete module.source;

    if (module.cssSource) {
      var el = document.createElement('style');
      el.setAttribute('type', 'text/css');
      if (el.styleSheet) {
        el.styleSheet.cssText = module.cssSource;
      } else {
        var content = document.createTextNode(module.cssSource);
        el.appendChild(content);
      }

      document.getElementsByTagName('head')[0].appendChild(el);
    }

    module.isReady = YES;
  },

  /**
    @private

    Creates <link> tags for every CSS resource in a module.

    @param {String} moduleName the name of the module whose CSS should be loaded
  */
  _loadCSSForModule: function (moduleName) {
    var head = document.getElementsByTagName('head')[0];
    var module = SC.MODULE_INFO[moduleName];
    var styles = module.styles || [];
    var len = styles.length;
    var url;
    var el;
    var idx;

    if (!head) head = document.documentElement; // fix for Opera
    len = styles.length;

    for (idx = 0; idx < len; idx++) {
      url = styles[idx];

      if (url.length > 0) {
        if (SC.LOG_MODULE_LOADING) SC.debug("SC.Module: Loading CSS file in '%@' -> '%@'", moduleName, url);

        // if we are on a retina device lets load the retina style sheet instead
        if (window.devicePixelRatio > 1 || window.location.search.indexOf("2x") > -1) {
          url = url.replace('.css', '@2x.css');
        }

        el = document.createElement('link');
        el.setAttribute('href', url);
        el.setAttribute('rel', "stylesheet");
        el.setAttribute('type', "text/css");
        head.appendChild(el);
      }
    }

    el = null;
  },

  _loadJavaScriptForModule: function (moduleName) {
    var module = SC.MODULE_INFO[moduleName];
    var el;
    var url;
    var dependencies = module.dependencies;
    var dependenciesAreLoaded = YES;

    // If this module has dependencies, determine if they are loaded.
    if (dependencies && dependencies.length > 0) {
      dependenciesAreLoaded = this._dependenciesMetForModule(moduleName);
    }

    // If the module is prefetched, always load the string representation.
    if (module.isPrefetched) {
      url = module.stringURL;
    } else {
      if (dependenciesAreLoaded) {
        // Either we have no dependencies or they've all loaded already,
        // so just execute the code immediately once it loads.
        url = module.scriptURL;
      } else {
        // Because the dependencies might load after this module, load the
        // string representation so we can execute it once all dependencies
        // are in place.
        url = module.stringURL;
      }
    }

    if (url.length > 0) {
      if (SC.LOG_MODULE_LOADING) SC.debug("SC.Module: Loading JavaScript file in '%@' -> '%@'", moduleName, url);

      el = document.createElement('script');
      el.setAttribute('type', "text/javascript");
      el.setAttribute('src', url);

      if (el.addEventListener) {
        el.addEventListener('load', function () {
          SC.run(function () {
            SC.Module._moduleDidLoad(moduleName);
          });
        }, false);
      } else if (el.readyState) {
        el.onreadystatechange = function () {
          if (this.readyState === 'complete' || this.readyState === 'loaded') {
            SC.run(function () {
              SC.Module._moduleDidLoad(moduleName);
            });
          }
        };
      }

      document.body.appendChild(el);
    }
  },

  /**
    @private

    Returns YES if all of the dependencies for a module are ready.

    @param {String} moduleName the name of the module being checked
    @returns {Boolean} whether the dependencies are loaded
  */
  _dependenciesMetForModule: function (moduleName) {
    var dependencies = SC.MODULE_INFO[moduleName].dependencies || [];
    var idx, len = dependencies.length;
    var dependencyName;
    var module;

    for (idx = 0; idx < len; idx++) {
      dependencyName = dependencies[idx];
      module = SC.MODULE_INFO[dependencyName];

      if (!module) throw new Error("SC.loadModule: Unable to find dependency %@ for module %@.".fmt(dependencyName, moduleName));

      if (!module.isReady) {
        return NO;
      }
    }

    return YES;
  },

  /**
    Loads all unloaded dependencies for a module, then creates the <script> and <link> tags to
    load the JavaScript and CSS for the module.
  */
  _loadDependenciesForModule: function (moduleName) {
    // Load module's dependencies first.
    var moduleInfo      = SC.MODULE_INFO[moduleName];
    var log             = SC.LOG_MODULE_LOADING;
    var dependencies    = moduleInfo.dependencies || [];
    var dependenciesMet = YES;
    var len             = dependencies.length;
    var idx;
    var requiredModuleName;
    var requiredModule;
    var dependents;

    for (idx = 0; idx < len; idx++) {
      requiredModuleName = dependencies[idx];
      requiredModule = SC.MODULE_INFO[requiredModuleName];

      // Try to find dependent module in MODULE_INFO
      if (!requiredModule) {
        throw new Error("SC.Module: could not find required module '%@' for module '%@'".fmt(requiredModuleName, moduleName));
      } else {

        // Required module has been requested but hasn't loaded yet.
        if (requiredModule.isLoading) {
          dependenciesMet = NO;

          dependents = requiredModule.dependents;
          if (!dependents) requiredModule.dependents = dependents = [];
          dependents.push(moduleName);
        }

        // Required module has already been loaded and evaluated, no need to worry about it.
        else if (requiredModule.isReady) {
          continue;
        }
        // Required module has not been loaded nor requested yet.
        else {
          dependenciesMet = NO;

          // Register this as a dependent module (used by SC._moduleDidLoad()...)
          dependents = requiredModule.dependents;
          if (!dependents) requiredModule.dependents = dependents = [];

          dependents.push(moduleName);

          if (log) SC.debug("SC.Module: '%@' depends on '%@', loading dependency…", moduleName, requiredModuleName);

          // Load dependencies
          SC.Module.loadModule(requiredModuleName);
        }
      }
    }
  },

  /**
    @private

    Calls an action on a target to notify the target that a module has loaded.
  */
  _invokeCallback: function (moduleName, targetName, methodName, args) {
    var method;
    var target;

    target = this._targetForTargetName(targetName);
    method = this._methodForMethodNameInTarget(methodName, target);

    // If we weren't able to find the callback, this module may be lazily instantiated and
    // the callback won't exist until we execute the closure that it is wrapped in.
    if (!method) {
      if (SC.LAZY_INSTANTIATION[moduleName]) {
        this._executeLazilyInstantiatedModule(moduleName, targetName, methodName);

        target = this._targetForTargetName(targetName);
        method = this._methodForMethodNameInTarget(methodName, target);
      } else {
        throw new Error("SC.Module: could not find callback for '%@'".fmt(moduleName));
      }
    }

    if (!args) {
      args = [];
    }

    // The first parameter passed to the callback is the name of the module.
    args.unshift(moduleName);

    // Invoke the callback. Wrap it in a run loop if we are not in a runloop already.
    var needsRunLoop = !!SC.RunLoop.currentRunLoop;
    if (needsRunLoop) {
      SC.run(function () {
        method.apply(target, args);
      });
    } else {
      method.apply(target, args);
    }
  },

  /** @private
    Given a module name, iterates through all registered callbacks and calls them.
  */
  _invokeCallbacksForModule: function (moduleName) {
    var moduleInfo = SC.MODULE_INFO[moduleName], callbacks;
    if (!moduleInfo) return; // shouldn't happen, but recover anyway

    if (SC.LOG_MODULE_LOADING) SC.debug("SC.Module: Module '%@' has completed loading, invoking callbacks.", moduleName);

    callbacks = moduleInfo.callbacks || [];

    for (var idx = 0, len = callbacks.length; idx < len; ++idx) {
      callbacks[idx]();
    }
  },

  _evaluateAndInvokeCallbacks: function (moduleName) {
    var moduleInfo = SC.MODULE_INFO;
    var module = moduleInfo[moduleName];
    var log = SC.LOG_MODULE_LOADING;

    if (log) SC.debug("SC.Module: Evaluating and invoking callbacks for '%@'.", moduleName);

    if (module.source) {
      this._evaluateStringLoadedModule(module);
    }

    // this is ugly, but a module evaluated late like this won't be done instantiating
    // until the end of a run loop. Also, the code here is not structured in a way that makes
    // it easy to "add a step" before saying a module is ready. And finally, invokeLater doesn't
    // accept arguments; hence, the closure.
    module.isWaitingForRunLoop = YES;
    this.invokeLast(function () {
      module.isReady = YES;
      this._moduleDidBecomeReady(moduleName);
    });
  },

  _moduleDidBecomeReady: function (moduleName) {
    var moduleInfo = SC.MODULE_INFO;
    var module = moduleInfo[moduleName];
    var log = SC.LOG_MODULE_LOADING;

    module.isWaitingForRunLoop = NO;

    if (SC.isReady) {
      SC.Module._invokeCallbacksForModule(moduleName);
      delete module.callbacks;
    } else {
      SC.ready(SC, function () {
        SC.Module._invokeCallbacksForModule(moduleName);
        delete module.callbacks;
      });
    }

    // for each dependent module, try and load them again...
    var dependents = module.dependents || [];
    var dependentName, dependent;

    for (var idx = 0, len = dependents.length; idx < len; idx++) {
      dependentName = dependents[idx];
      dependent = moduleInfo[dependentName];
      if (dependent.isLoaded && this._dependenciesMetForModule(dependentName)) {
        if (log) SC.debug("SC.Module: Now that %@ has loaded, all dependencies for a dependent %@ are met.", moduleName, dependentName);
        this._evaluateAndInvokeCallbacks(dependentName);
      }
    }

  },

  /** @private
    Called when the JavaScript for a module finishes loading.

    Any pending callbacks are called (if SC.isReady), and any dependent
    modules which were waiting for this module to load are notified so they
    can continue loading.

    @param moduleName {String} the name of the module that just loaded
  */
  _moduleDidLoad: function (moduleName) {
    var module = SC.MODULE_INFO[moduleName];
    var log    = SC.LOG_MODULE_LOADING;
    var dependenciesMet;
    var callbacks, targets;

    if (log) SC.debug("SC.Module: Module '%@' finished loading.", moduleName);

    if (!module) {
      if (log) SC.debug("SC._moduleDidLoad() called for unknown module '@'.", moduleName);
      module = SC.MODULE_INFO[moduleName] = { isLoaded: YES, isReady: YES };
      return;
    }

    if (module.isLoaded) {
      if (log) SC.debug("SC._moduleDidLoad() called more than once for module '%@'. Skipping.", moduleName);
      return;
    }

    // Remember that we're loaded.
    delete module.isLoading;
    module.isLoaded = YES;

    if (!module.isPrefetching) {
      dependenciesMet = this._dependenciesMetForModule(moduleName);
      if (dependenciesMet) {
        this._evaluateAndInvokeCallbacks(moduleName);
      } else {
        if (log) SC.debug("SC.Module: Dependencies for '%@' not met yet, waiting to evaluate.", moduleName);
      }
    } else {
      delete module.isPrefetching;
      if (log) SC.debug("SC.Module: Module '%@' was prefetched, not evaluating until needed.", moduleName);
    }
  },

  /**
    @private

    If necessary, converts a property path into a target object.

    @param {String|Object} targetName the string or object representing the target
    @returns Object
  */
  _targetForTargetName: function (targetName) {
    if (SC.typeOf(targetName) === SC.T_STRING) {
      return SC.objectForPropertyPath(targetName);
    }

    return targetName;
  },

  /**
    @private

    If necessary, converts a property path into a method object.

    @param {String|Object} methodName the string or object representing the method
    @param {Object} target the target from which to retrieve the method
    @returns Object
  */
  _methodForMethodNameInTarget: function (methodName, target) {
    if (SC.typeOf(methodName) === SC.T_STRING) {
      return SC.objectForPropertyPath(methodName, target);
    }

    return methodName;
  },

  /**
    A list of the methods to temporarily disable (and buffer calls for) when we are suspended.
  */
  methodsForSuspend: "loadModule _moduleDidLoad prefetchModule _moduleDidBecomeReady".w(),

  /**
    Call this in order to prevent expensive tasks from occurring at inopportune times.
  */
  suspend: function () {

    //Increment the suspension count, to support nested suspend()/resume() pairs.
    //We only do anything if the suspend count ends up at 1, as that implies it's
    //the first suspend() call.
    this._suspendCount = (this._suspendCount || 0) + 1;
    if (this._suspendCount !== 1) return;

    //Yummy variables.
    var methods = this.get('methodsForSuspend'),
        replaceKey, saveKey, key, i;

    //Now we go through the list of methods to suspend, and overwrite them with
    //versions that will buffer their calls in a _bufferedCalls array.
    for (i = 0; (key = methods[i]); i++) {
      //jshint loopfunc: true
      //Ensure the replacement function exists at a key where it'll be cached.
      if (!this[replaceKey = "__replacement_" + key + "__"]) {
        (this[replaceKey] = function () {
          (this._bufferedCalls || (this._bufferedCalls = [])).push({
            method: arguments.callee.methodName,
            arguments: arguments
          });
        }).methodName = key;
      }

      //Ensure the original function exists at a key where it'll be cached.
      if (!this[saveKey = "__saved_" + key + "__"]) this[saveKey] = this[key];

      //Ensure that the replacement function exists where the rest of the
      //code expects the original.
      this[key] = this[replaceKey];
    }
  },

  /**
    Call this in order to resume normal behavior of the methods here, and to
    finally perform any calls that may have occurred during suspension. Calls
    will run in the order they were received.
  */
  resume: function () {

    //First, we need to decrement the suspension count, and warn if the suspension
    //count implied that we weren't already suspended. Furthermore, if the suspend
    //count is not zero, then we haven't tackled the last suspend() call with a resume(),
    //and should therefore not resume.
    this._suspendCount = (this._suspendCount || 0) - 1;
    if (this._suspendCount < 0) {
      SC.warn("SC.Module.resume() was called without SC.Module having been in a suspended state. Call aborted.");
      this._suspendCount = 0;
      return;
    }
    if (this._suspendCount > 0) return;

    //Yummy variables.
    var methods = this.get('methodsForSuspend'),
        calls = this._bufferedCalls,
        key, i, method, call;

    //Restore the original methods to where they belong for normal functionality.
    for (i = 0; (key = methods[i]); i++) this[key] = this["__saved_" + key + "__"];

    //Perform any buffered calls that built up during the suspended period.
    for (i = 0; (call = calls) && calls[i]; i++) this[call.method].apply(this, call.arguments);

    //Clear the list of calls, so subsequent resume() calls won't flush them again.
    if (calls) calls.length = 0;
  }
});

/**
Inspect the list of modules and, for every prefetched module, create a
background task to load the module when the user remains idle.
*/
SC.ready(function () {
  var moduleInfo = SC.MODULE_INFO;
  var moduleName;
  var module;
  var task;

  // Iterate through all known modules and look for those that are marked
  // as prefetched.
  for (moduleName in moduleInfo) {
    module = moduleInfo[moduleName];

    if (module.isPrefetched) {
      // Create a task that will load the module, and then register it with
      // the global background task queue.
      task = SC.Module.PrefetchModuleTask.create({ prefetchedModuleName: moduleName });
      SC.backgroundTaskQueue.push(task);
    }
  }
});

SC.Module.PrefetchModuleTask = SC.Task.extend({
  prefetchedModuleName: null,
  run: function () {
    SC.Module.prefetchModule(this.prefetchedModuleName);
  }
});

/* >>>>>>>>>> BEGIN source/system/task_queue.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require("tasks/task");

/**
  Runs a set of tasks. Most importantly, has a runWhenIdle option that allows
  it to run when no user input is occurring. This allows, for instance, preloading
  bundles while not blocking user interaction.
*/
SC.TaskQueue = SC.Task.extend({
  
  init: function() {
    var self = this;
    this._doIdleEntry = function() {
      self._idleEntry();
    };
    
    this._suspendCount = 0;
    this._tasks = [];
  },
  
  /**
    If YES, the queue will automatically run in the background when the browser idles.
  */
  runWhenIdle: NO,
  
  /**
    A limit which, if exceeded, the task queue will wait until a later run
    to continue.
  */
  runLimit: 50,
  
  /**
    The duration between idle runs.
  */
  interval: 50,
  
  /**
    If running, YES.
  */
  isRunning: NO,
  
  /**
    The minimum elapsed time since the last event. As a rule of thumb, perhaps
    something equivalent to the expected duration of a task.
  */
  minimumIdleDuration: 500,
  
  _tasks: null,
  
  /**
    Returns YES if there are tasks in the queue.
  */
  hasTasks: function() {
    return this._tasks.length > 0;
  }.property('taskCount').cacheable(),
  
  /**
    Returns the number of tasks in the queue.
  */
  taskCount: function() {
    return this._tasks.length;
  }.property().cacheable(),
  
  /**
    Adds the task to the end of the queue.
  */
  push: function(task) {
    this._tasks.push(task);
    this.notifyPropertyChange('taskCount');
  },
  
  /**
    Removes and returns the first task in the queue.
  */
  next: function() {
    // null if there is no task
    if (this._tasks.length < 1) return null;
    
    // otherwise, return the first one in the queue
    var next = this._tasks.shift();
    this.notifyPropertyChange('taskCount');
    return next;
  },
  
  /**
    Suspends cycling of the queue. Only affects task queues that run when idle,
    such as the backgroundTaskQueue.
  */
  suspend: function() {
    this._suspendCount++;
  },
  
  /**
    Resumes cycling of the queue.
  */
  resume: function() {
    this._suspendCount--;
    if (this._suspendCount <= 0) {
      this._setupIdle();
    }
  },
  
  /**
    @private
    Sets up idling if needed when the task count changes.
  */
  _taskCountDidChange: function() {
    this._setupIdle();
  }.observes('taskCount'),
  
  /**
    When runWhenIdle changes, we need to setup idle again if needed. This allows us to suspend
    and resume processing of the background task queue.
  */
  _runWhenIdleDidChange: function() {
    this._setupIdle();
  }.observes('runWhenIdle'),
  
  /**
    Sets up the scheduled idling check if needed and applicable.
    @private
  */
  _setupIdle: function() {
    if (
      !this._suspendCount && this.get('runWhenIdle') && 
      !this._idleIsScheduled && this.get('taskCount') > 0
    ) {
      setTimeout(this._doIdleEntry, 
        this.get('interval')
      );
      this._idleIsScheduled = YES;
    }
  },
  
  /**
    The entry point for the idle.
    @private
  */
  _idleEntry: function() {
    this._idleIsScheduled = NO;
    var last = SC.RunLoop.lastRunLoopEnd;
    
    // if we are not supposed to run when idle we need to short-circuit out.
    if (!this.get('runWhenIdle') && !this._suspendCount) return;
    
    // if no recent events (within < 1s)
    if (Date.now() - last > this.get('minimumIdleDuration')) {
      SC.run(this.run, this);
      SC.RunLoop.lastRunLoopEnd = last; // we were never here
    }
    
    // set up idle timer if needed
    this._setupIdle();
  },
  
  /**
    Runs tasks until limit (TaskQueue.runLimit by default) is reached.
  */
  run: function(limit) {
    this.set("isRunning", YES);
    if (!limit) limit = this.get("runLimit");
    
    var task, start = Date.now();
    
    while (task = this.next()) {
      task.run(this);
      
      // check if the limit has been exceeded
      if (Date.now() - start > limit) break;
    }
    
    this.set("isRunning", NO);
  }
  
  
});

SC.backgroundTaskQueue = SC.TaskQueue.create({
  runWhenIdle: YES
});

/* >>>>>>>>>> BEGIN source/system/text_selection.js */
// ==========================================================================
// Project:   SproutCore Costello - Property Observing Library
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/**
  @class

  A simple object representing the selection inside a text field.  Each
  object is frozen and contains exactly three properties:

    *  start
    *  end
    *  length

  Important note:  In Internet Explorer, newlines in textarea elements are
  considered two characters.  SproutCore does not currently try to hide this from you.

  @extends SC.Object
  @extends SC.Copyable
  @extends SC.Freezable
  @since SproutCore 1.0
*/

SC.TextSelection = SC.Object.extend(SC.Copyable, SC.Freezable,
/** @scope SC.TextSelection.prototype */ {

  /**
    The number of characters appearing to the left of the beginning of the
    selection, starting at 0.

    @type {Number}
  */
  start: -1,


  /**
    The number of characters appearing to the left of the end of the
    selection.

    This will have the same value as 'start' if there is no selection and
    instead there is only a caret.

    @type {Number}
  */
  end: -1,


  /**
    The length of the selection.  This is equivalent to (end - start) and
    exists mainly as a convenience.

    @type Number
  */
  length: function() {
    var start = this.get('start') ;
    var end   = this.get('end') ;
    if ((start) === -1  ||  (end === -1)) {
      return -1 ;
    }
    else {
      return end - start ;
    }
  }.property('start', 'end').cacheable(),



  // ..........................................................
  // INTERNAL SUPPORT
  //

  init: function() {
    arguments.callee.base.apply(this,arguments);
    this.freeze();
  },


  copy: function() {
    return SC.TextSelection.create({
      start: this.get('start'),
      end:   this.get('end')
    });
  },


  toString: function() {
    var length = this.get('length');
    if (length  &&  length > 0) {
      if (length === 1) {
        return "[%@ character selected: {%@, %@}]".fmt(length, this.get('start'), this.get('end'));
      }
      else {
        return "[%@ characters selected: {%@, %@}]".fmt(length, this.get('start'), this.get('end'));
      }
    }
    else {
      return "[no text selected; caret at %@]".fmt(this.get('start'));
    }
  }

}) ;

/* >>>>>>>>>> BEGIN source/system/user_defaults.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals ie7userdata openDatabase*/
/**
  @class

  The UserDefaults object provides an easy way to store user preferences in
  your application on the local machine.  You use this by providing built-in
  defaults using the SC.userDefaults.defaults() method.  You can also
  implement the UserDefaultsDelegate interface to be notified whenever a
  default is required.

  You should also set the userDomain property on the defaults on page load.
  This will allow the UserDefaults application to store/fetch keys from
  localStorage for the correct user.

  You can also set an appDomain property if you want.  This will be
  automatically prepended to key names with no slashes in them.

  SC.userDefaults.getPath("global:contactInfo.userName");

  @extends SC.Object
  @since SproutCore 1.0
*/
SC.UserDefaults = SC.Object.extend(/** @scope SC.UserDefaults.prototype */ {

  ready: NO,

  /**
    the default domain for the user.  This will be used to store keys in
    local storage.  If you do not set this property, the wrong values may be
    returned.
  */
  userDomain: null,

  /**
    The default app domain for the user.  Any keys that do not include a
    slash will be prefixed with this app domain key when getting/setting.
  */
  appDomain: null,

  /** @private
    Defaults.  These will be used if not defined on localStorage.
  */
  _defaults: null,

  _safari3DB: null,

  /**
    Invoke this method to set the builtin defaults.  This will cause all
    properties to change.
  */
  defaults: function(newDefaults) {
    this._defaults = newDefaults ;
    this.allPropertiesDidChange();
  },

  /**
    Attempts to read a user default from local storage.  If not found on
    localStorage, use the the local defaults, if defined.  If the key passed
    does not include a slash, then add the appDomain or use "app/".

    @param {String} keyName
    @returns {Object} read value
  */
  readDefault: function(keyName) {
    // Note: different implementations of localStorage may return 'null' or
    // may return 'undefined' for missing properties so use SC.none() to check
    // for the existence of ret throughout this function.
    var isIE7, ret, userKeyName, localStorage, key, del, storageSafari3;

    // namespace keyname
    keyName = this._normalizeKeyName(keyName);
    userKeyName = this._userKeyName(keyName);

    // look into recently written values
    if (this._written) { ret = this._written[userKeyName]; }

    // attempt to read from localStorage
    isIE7 = SC.browser.isIE &&
        SC.browser.compare(SC.browser.version, '7') === 0;

    if(isIE7) {
      localStorage=document.body;
      try{
        localStorage.load("SC.UserDefaults");
      }catch(e){
        SC.Logger.error("Couldn't load userDefaults in IE7: "+e.description);
      }
    }else if(this.HTML5DB_noLocalStorage){
      storageSafari3 = this._safari3DB;
    }else{
      localStorage = window.localStorage ;
      if (!localStorage && window.globalStorage) {
        localStorage = window.globalStorage[window.location.hostname];
      }
    }
    if (localStorage || storageSafari3) {
      key=["SC.UserDefaults",userKeyName].join('-at-');
      if(isIE7) {
        ret=localStorage.getAttribute(key.replace(/\W/gi, ''));
      } else if(storageSafari3) {
        ret = this.dataHash[key];
      } else {
        ret = localStorage[key];
      }
      if (!SC.none(ret)) {
        try { ret = SC.json.decode(ret); }
        catch(ex) {}
      }
    }

    // if not found in localStorage, try to notify delegate
    del = this.delegate ;
    if (del && del.userDefaultsNeedsDefault) {
      ret = del.userDefaultsNeedsDefault(this, keyName, userKeyName);
    }

    // if not found in localStorage or delegate, try to find in defaults
    if (SC.none(ret) && this._defaults) {
      ret = this._defaults[userKeyName] || this._defaults[keyName];
    }

    return ret ;
  },

  /**
    Attempts to write the user default to local storage or at least saves them
    for now.  Also notifies that the value has changed.

    @param {String} keyName
    @param {Object} value
    @returns {SC.UserDefault} receiver
  */
  writeDefault: function(keyName, value) {
    var isIE7, userKeyName, written, localStorage, key, del, storageSafari3;

    keyName = this._normalizeKeyName(keyName);
    userKeyName = this._userKeyName(keyName);

    // save to local hash
    written = this._written ;
    if (!written) { written = this._written = {}; }
    written[userKeyName] = value ;

    // save to local storage
    isIE7 = SC.browser.isIE &&
        SC.browser.compare(SC.browser.version, '7') === 0;

    if(isIE7){
      localStorage=document.body;
    }else if(this.HTML5DB_noLocalStorage){
      storageSafari3 = this._safari3DB;
    }else{
       localStorage = window.localStorage ;
       if (!localStorage && window.globalStorage) {
         localStorage = window.globalStorage[window.location.hostname];
       }
    }
    key=["SC.UserDefaults",userKeyName].join('-at-');
    if (localStorage || storageSafari3) {
      var encodedValue = SC.json.encode(value);
      if(isIE7){
        localStorage.setAttribute(key.replace(/\W/gi, ''), encodedValue);
        localStorage.save("SC.UserDefaults");
      }else if(storageSafari3){
        var obj = this;
        storageSafari3.transaction(
          function (t) {
            t.executeSql("delete from SCLocalStorage where key = ?", [key],
              function (){
                t.executeSql("insert into SCLocalStorage(key, value)"+
                            " VALUES ('"+key+"', '"+encodedValue+"');",
                            [], obj._nullDataHandler, obj.killTransaction
                );
              }
            );
          }
        );
        this.dataHash[key] = encodedValue;
      }else{
        try{
          localStorage[key] = encodedValue;
        }catch(e){
          SC.Logger.error("Failed using localStorage. "+e);
        }
      }
    }

    // also notify delegate
    del = this.delegate;
    if (del && del.userDefaultsDidChange) {
      del.userDefaultsDidChange(this, keyName, value, userKeyName);
    }

    return this ;
  },

  /**
    Removed the passed keyName from the written hash and local storage.

    @param {String} keyName
    @returns {SC.UserDefaults} receiver
  */
  resetDefault: function(keyName) {
    var fullKeyName, isIE7, userKeyName, written, localStorage, key, storageSafari3;
    fullKeyName = this._normalizeKeyName(keyName);
    userKeyName = this._userKeyName(fullKeyName);

    this.propertyWillChange(keyName);
    this.propertyWillChange(fullKeyName);

    written = this._written;
    if (written) delete written[userKeyName];

    isIE7 = SC.browser.isIE &&
        SC.browser.compare(SC.browser.version, '7') === 0;

    if(isIE7){
       localStorage=document.body;
    }else if(this.HTML5DB_noLocalStorage){
         storageSafari3 = this._safari3DB;
    }else{
       localStorage = window.localStorage ;
       if (!localStorage && window.globalStorage) {
         localStorage = window.globalStorage[window.location.hostname];
       }
    }

    key=["SC.UserDefaults",userKeyName].join('-at-');

    if (localStorage) {
      if(isIE7){
        localStorage.setAttribute(key.replace(/\W/gi, ''), null);
        localStorage.save("SC.UserDefaults");
      } else if(storageSafari3){
        var obj = this;
        storageSafari3.transaction(
          function (t) {
            t.executeSql("delete from SCLocalStorage where key = ?", [key], null);
          }
        );
        delete this.dataHash[key];
      }else{
        // In case error occurs while deleting local storage in any browser,
        // do not allow it to propagate further
        try{
          delete localStorage[key];
        } catch(e) {
          SC.Logger.warn('Deleting local storage encountered a problem. '+e);
        }
      }
    }


    this.propertyDidChange(keyName);
    this.propertyDidChange(fullKeyName);
    return this ;
  },

  /**
    Is called whenever you .get() or .set() values on this object

    @param {Object} key
    @param {Object} value
    @returns {Object}
  */
  unknownProperty: function(key, value) {
    if (value === undefined) {
      return this.readDefault(key) ;
    } else {
      this.writeDefault(key, value);
      return value ;
    }
  },

  /**
    Normalize the passed key name.  Used by all accessors to automatically
    insert an appName if needed.
  */
  _normalizeKeyName: function(keyName) {
    if (keyName.indexOf(':')<0) {
      var domain = this.get('appDomain') || 'app';
      keyName = [domain, keyName].join(':');
    }
    return keyName;
  },

  /**
    Builds a user key name from the passed key name
  */
  _userKeyName: function(keyName) {
    var user = this.get('userDomain') || '(anonymous)' ;
    return [user,keyName].join('-at-');
  },

  _domainDidChange: function() {
    var didChange = NO;
    if (this.get("userDomain") !== this._scud_userDomain) {
      this._scud_userDomain = this.get('userDomain');
      didChange = YES;
    }

    if (this.get('appDomain') !== this._scud_appDomain) {
      this._scud_appDomain = this.get('appDomain');
      didChange = YES;
    }

    if (didChange) this.allPropertiesDidChange();
  }.observes('userDomain', 'appDomain'),

  init: function() {
    arguments.callee.base.apply(this,arguments);
    var isIE7;

    // Increment the jQuery ready counter, so that SproutCore will
    // defer loading the app until the user defaults are available.
    jQuery.readyWait++;

    if(SC.userDefaults && SC.userDefaults.get('dataHash')){
      var dh = SC.userDefaults.get('dataHash');
      if (dh) this.dataHash=SC.userDefaults.get('dataHash');
    }
    this._scud_userDomain = this.get('userDomain');
    this._scud_appDomain  = this.get('appDomain');

    isIE7 = SC.browser.isIE &&
        SC.browser.compare(SC.browser.version, '7') === 0;

    if(isIE7){
      //Add user behavior userData. This works in all versions of IE.
      //Adding to the body as is the only element never removed.
      document.body.addBehavior('#default#userData');
    }
    this.HTML5DB_noLocalStorage = SC.browser.isWebkit &&
      SC.browser.compare(SC.browser.engineVersion, '523')>0 &&
      SC.browser.compare(SC.browser.engineVersion, '528')<0;
    if(this.HTML5DB_noLocalStorage){
      var myDB;
      try {
        if (!window.openDatabase) {
          SC.Logger.error("Trying to load a database with safari version 3.1 "+
                  "to get SC.UserDefaults to work. You are either in a"+
                  " previous version or there is a problem with your browser.");
          return;
        } else {
          var shortName = 'scdb',
              version = '1.0',
              displayName = 'SproutCore database',
              maxSize = 65536; // in bytes,
          myDB = openDatabase(shortName, version, displayName, maxSize);

          // You should have a database instance in myDB.

        }
      } catch(e) {
        SC.Logger.error("Trying to load a database with safari version 3.1 "+
                "to get SC.UserDefaults to work. You are either in a"+
                " previous version or there is a problem with your browser.");
        return;
      }

      if(myDB){
        var obj = this;
        myDB.transaction(
          function (transaction) {
            transaction.executeSql('CREATE TABLE IF NOT EXISTS SCLocalStorage'+
              '(key TEXT NOT NULL PRIMARY KEY, value TEXT NOT NULL);',
              [], obj._nullDataHandler, obj.killTransaction);
          }
        );
        myDB.transaction(
          function (transaction) {

            transaction.parent = obj;
            transaction.executeSql('SELECT * from SCLocalStorage;',
                [], function(transaction, results){
                  var hash={}, row;
                  for(var i=0, iLen=results.rows.length; i<iLen; i++){
                    row=results.rows.item(i);
                    hash[row['key']]=row['value'];
                  }
                  transaction.parent.dataHash = hash;
                  SC.run(function() { jQuery.ready(true); });
                }, obj.killTransaction);
          }
        );
        this._safari3DB=myDB;
      }
    }else{
      jQuery.ready(true);
    }
  },


  //Private methods to use if user defaults uses the database in safari 3
  _killTransaction: function(transaction, error){
    return true; // fatal transaction error
  },

  _nullDataHandler: function(transaction, results){}
});

/** global user defaults. */
SC.userDefaults = SC.UserDefaults.create();

/* >>>>>>>>>> BEGIN source/system/utils/colors.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/**
  These functions are deprecated use SC.Color instead.
  @deprecated
  @see SC.Color
 */
SC.mixin ( /** @scope SC */ {

  /** Returns hex color from hsv value */
  convertHsvToHex: function (h, s, v) {
    
    SC.Logger.warn("SC.convertHsvToHex is deprecated. Please use SC.Color.hsvToRgb instead.");
    
    var rgb = SC.Color.hsvToRgb(h, s, v);
    return SC.Color.create({ r: rgb[0], g: rgb[1], b: rgb[2] }).toHex();
  },

  /** Returns hsv color from hex value */
  convertHexToHsv: function (hex) {
    
    SC.Logger.warn("SC.convertHexToHsv is deprecated. Please use SC.Color.rgbToHsv instead.");
    
    var color = SC.Color.from(hex);
    return color && SC.Color.rgbToHsv(color.r, color.g, color.b);
  },

  /** regular expression for parsing color: rgb, hex */
  PARSE_COLOR_RGBRE: /^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i,
  PARSE_COLOR_HEXRE: /^\#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/,

  // return an array of r,g,b colour
  expandColor: function(color) {
    
    SC.Logger.warn("SC.expandColor is deprecated. Please use SC.Color.from instead.");
    
    var hexColor, red, green, blue;
    hexColor = this.parseColor(color);
    if (hexColor) {
      red = parseInt(hexColor.slice(1, 3), 16);
      green = parseInt(hexColor.slice(3, 5), 16);
      blue = parseInt(hexColor.slice(5, 7), 16);
      return [red,green,blue];
    }
  },

  // parse rgb color or 3-digit hex color to return a properly formatted 6-digit hex colour spec, or false
  parseColor: function(string) {
    
    SC.Logger.warn("SC.expandColor is deprecated. Please use SC.Color.from instead.");
    
    var i=0, color = '#', match, part;
    if(match = this.PARSE_COLOR_RGBRE.exec(string)) {
      for (i=1; i<=3; i++) {
        part = Math.max(0, Math.min(255, parseInt(match[i],0)));
        color += this.toColorPart(part);
      }
      return color;
    }
    if (match = this.PARSE_COLOR_HEXRE.exec(string)) {
      if(match[1].length == 3) {
        for (i=0; i<3; i++) {
          color += match[1].charAt(i) + match[1].charAt(i);
        }
        return color;
      }
      return '#' + match[1];
    }
    return false;
  },

  // convert one r,g,b number to a 2 digit hex string
  toColorPart: function(number) {
    if (number > 255) number = 255;
    var digits = number.toString(16);
    if (number < 16) return '0' + digits;
    return digits;
  }


});

/* >>>>>>>>>> BEGIN source/system/utils/misc.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

SC.mixin( /** @scope SC */ {
  _downloadFrames: 0, // count of download frames inserted into document

  /**
    Starts a download of the file at the named path.

    Use this method when you want to cause a file to be downloaded to a users
    desktop instead of having it display in the web browser.  Note that your
    server must return a header indicating that the file  is intended for
    download also.
  */
  download: function(path) {
    var tempDLIFrame=document.createElement('iframe'),
        frameId = 'DownloadFrame_' + this._downloadFrames;
    SC.$(tempDLIFrame).attr('id',frameId);
    tempDLIFrame.style.border='10px';
    tempDLIFrame.style.width='0px';
    tempDLIFrame.style.height='0px';
    tempDLIFrame.style.position='absolute';
    tempDLIFrame.style.top='-10000px';
    tempDLIFrame.style.left='-10000px';
    // Don't set the iFrame content yet if this is Safari
    if (!SC.browser.isSafari) {
      SC.$(tempDLIFrame).attr('src',path);
    }
    document.getElementsByTagName('body')[0].appendChild(tempDLIFrame);
    if (SC.browser.isSafari) {
      SC.$(tempDLIFrame).attr('src',path);
    }
    this._downloadFrames = this._downloadFrames + 1;
    if (!SC.browser.isSafari) {
      var r = function() {
        document.body.removeChild(document.getElementById(frameId));
        frameId = null;
      } ;
      r.invokeLater(null, 2000);
    }
    //remove possible IE7 leak
    tempDLIFrame = null;
  },

  // Get the computed style from specific element. Useful for cloning styles
  getStyle: function(oElm, strCssRule){
    var strValue = "";
    if(document.defaultView && document.defaultView.getComputedStyle){
      strValue = document.defaultView.getComputedStyle(oElm, "").getPropertyValue(strCssRule);
    }
    else if(oElm.currentStyle){
     strCssRule = strCssRule.replace(/\-(\w)/g, function (strMatch, p1){
      return p1.toUpperCase();
     });
     strValue = oElm.currentStyle[strCssRule];
    }
    return strValue;
  },

  // Convert double byte characters to standard Unicode. Considers only
  // conversions from zenkaku to hankaky roomaji
  uniJapaneseConvert: function (str){
    var nChar, cString= '', j, jLen;
    //here we cycle through the characters in the current value
    for (j=0, jLen = str.length; j<jLen; j++){
      nChar = str.charCodeAt(j);

      //here we do the unicode conversion from zenkaku to hankaku roomaji
      nChar = ((nChar>=65281 && nChar<=65392)?nChar-65248:nChar);

      //MS IME seems to put this character in as the hyphen from keyboard but not numeric pad...
      nChar = ( nChar===12540?45:nChar) ;
      cString = cString + String.fromCharCode(nChar);
    }
    return cString;
  },

  /**
    Determines if the given point is within the given element.

    The test rect will include the element's padding and can be configured to
    optionally include the border or border and margin.

    @param {Object} point the point as an Object (ie. Hash) in the form { x: value, y: value }.
    @param {DOMElement|jQuery|String} elem the element to test inclusion within.
      This is passed to `jQuery()`, so any value supported by `jQuery()` will work.
    @param {String} includeFlag flag to determine the dimensions of the element to test within.
      One of either: 'padding', 'border' or 'margin' (default: 'border').
    @param {String} relativeToFlag flag to determine which relative element to determine offset by.
      One of either: 'document', 'viewport' or 'parent' (default: 'document').
    @returns {Boolean} YES if the point is within the element; NO otherwise
  */

  // Note: This method is the most correct way to test the inclusion of a point within a DOM element.
  // First, it uses SC.offset which is a slightly improved version of jQuery's offset and much more reliable
  // than writing your own offset determination code.
  // Second, the offset must be adjusted to account for the element's left and top border
  // if not including the border or to account for the left and top margins when including the margins.
  pointInElement: function(point, elem, includeFlag, relativeToFlag) {
    var offset,
        width,
        height,
        rect;

    elem = jQuery(elem);
    includeFlag = includeFlag || 'border';

    // Find the offset
    offset = SC.offset(elem, relativeToFlag);

    // Find the dimensions
    if (includeFlag === 'padding') {
      width = elem.innerWidth();
      height = elem.innerHeight();

      // Adjust offset to account for top & left borders
      offset.x += window.parseInt(elem.css('border-left-width').replace('px', ''));
      offset.y += window.parseInt(elem.css('border-top-width').replace('px', ''));
    } else {
      width = elem.outerWidth(includeFlag === 'margin');
      height = elem.outerHeight(includeFlag === 'margin');

      if (includeFlag === 'margin') {
        // Adjust offset to account for top & left margins
        offset.x -= window.parseInt(elem.css('margin-left').replace('px', ''));
        offset.y -= window.parseInt(elem.css('margin-top').replace('px', ''));
      }
    }

    rect = {
      x: offset.x,
      y: offset.y,
      width: width,
      height: height
    };

    return SC.pointInRect(point, rect);
  },


  /**
    Switch the scale of your app. Useful when visualizing apps not designed
    for iphone.
  */
  switchScale: function() {
    $('head meta[name=viewport]').remove();
    if(window.innerWidth === window.screen.width){
      $('head').prepend('<meta name="viewport" content="width=device-width, initial-scale=0.5, maximum-scale=0.5, minimum-scale=0.5, user-scalable=0" />');
    }else{
      $('head').prepend('<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=0" />');
    }
  }
});

/* >>>>>>>>>> BEGIN source/system/utils/range.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

SC.mixin( /** @scope SC */ {
  /** A zero length range at zero. */
  ZERO_RANGE: { start: 0, length: 0 },

  RANGE_NOT_FOUND: { start: 0, length: -1 },

  /** Returns true if the passed index is in the specified range */
  valueInRange: function(value, range) {
    return (value >= 0) && (value >= range.start) && (value < (range.start + range.length));
  },

  /** Returns first value of the range. */
  minRange: function(range) { return range.start; },

  /** Returns the first value outside of the range. */
  maxRange: function(range) { return (range.length < 0) ? -1 : (range.start + range.length); },

  /** Returns the union of two ranges.  If one range is null, the other
   range will be returned.  */
  unionRanges: function(r1, r2) {
    if ((r1 == null) || (r1.length < 0)) return r2 ;
    if ((r2 == null) || (r2.length < 0)) return r1 ;

    var min = Math.min(r1.start, r2.start),
        max = Math.max(SC.maxRange(r1), SC.maxRange(r2)) ;
    return { start: min, length: max - min } ;
  },

  /** Returns the intersection of the two ranges or SC.RANGE_NOT_FOUND */
  intersectRanges: function(r1, r2) {
    if ((r1 == null) || (r2 == null)) return SC.RANGE_NOT_FOUND ;
    if ((r1.length < 0) || (r2.length < 0)) return SC.RANGE_NOT_FOUND;
    var min = Math.max(SC.minRange(r1), SC.minRange(r2)),
        max = Math.min(SC.maxRange(r1), SC.maxRange(r2)) ;
    if (max < min) return SC.RANGE_NOT_FOUND ;
    return { start: min, length: max-min };
  },

  /** Returns the difference of the two ranges or SC.RANGE_NOT_FOUND */
  subtractRanges: function(r1, r2) {
    if ((r1 == null) || (r2 == null)) return SC.RANGE_NOT_FOUND ;
    if ((r1.length < 0) || (r2.length < 0)) return SC.RANGE_NOT_FOUND;
    var max = Math.max(SC.minRange(r1), SC.minRange(r2)),
        min = Math.min(SC.maxRange(r1), SC.maxRange(r2)) ;
    if (max < min) return SC.RANGE_NOT_FOUND ;
    return { start: min, length: max-min };
  },

  /** Returns a clone of the range. */
  cloneRange: function(r) {
    return { start: r.start, length: r.length };
  },

  /** Returns true if the two passed ranges are equal.  A null value is
    treated like RANGE_NOT_FOUND.
  */
  rangesEqual: function(r1, r2) {
    if (r1===r2) return true ;
    if (r1 == null) return r2.length < 0 ;
    if (r2 == null) return r1.length < 0 ;
    return (r1.start == r2.start) && (r1.length == r2.length) ;
  }

});

/* >>>>>>>>>> BEGIN source/system/utils/string_metric_optimization.js */
SC.mixin( /** @scope SC */ {
  /**
    This function is similar to SC.metricsForString, but takes an extra argument after the string and before the exampleElement.
    That extra argument is *maxWidth*, which is the maximum allowable width in which the string can be displayed. This function
    will find the narrowest width (within *maxWidth*) that keeps the text at the same number of lines it would've normally wrapped
    to had it simply been put in a container of width *maxWidth*.

    If you have text that's 900 pixels wide on a single line, but pass *maxWidth* as 800, the metrics that will be returned will
    specify a height of two lines' worth of text, but a width of only around 450 pixels. The width this function determines will
    cause the text to be split as evenly as possible over both lines.

    If your text is 1500 pixels wide and *maxWidth* is 800, the width you'll get back will be approximately 750 pixels, because
    the 1500 horizontal pixels of text will still fit within two lines.

    If your text grows beyond 1600 horizontal pixels, it'll wrap to three lines. Suppose you have 1700 pixels of text. This much
    text would require three lines at 800px per line, but this function will return you a width of approximately 1700/3 pixels,
    in order to fill out the third line of text so it isn't just ~100px long.

    A binary search is used to find the optimimum width. There's no way to ask the browser this question, so the answer must be
    searched for. Understandably, this can cause a lot of measurements, which are NOT cheap.

    Therefore, very aggressive caching is used in order to get out of having to perform the search. The final optimimum width is a
    result of all the following values:

      - The string itself
      - The styles on the exampleElement
      - The classNames passed in
      - Whether ignoreEscape is YES or NO

    The caching goes against all of these in order to remember results. Note that maxWidth, though an argument, isn't one of them;
    this means that the optimal width will be searched for only once per distinct *number of lines of text* for a given string and
    styling. However, due to the fact that a passed exampleElement can have different styles a subsequent time it's passed in (but
    still remains the same object with the same GUID, etc), caching will not be enabled unless you either pass in a style string
    instead of an element, or unless your element has *cacheableForMetrics: YES* as a key on it. In most situations, the styles on
    an element won't change from call to call, so this is purely defensive and for arguably infrequent benefit, but it's good
    insurance. If you set the *cacheableForMetrics* key to YES on your exampleElement, caching will kick in, and repeated calls to
    this function will cease to have any appreciable amortized cost.

    The caching works by detecting and constructing known intervals of width for each number of lines required by widths in those
    intervals. As soon as you get a result from this function, it remembers that any width between the width it returned and the
    maxWidth you gave it will return that same result. This also applies to maxWidths greater than the with you passed in, up
    until the width at which the text can fit inside maxWidth with one fewer line break. However, at this point, the function
    can't know how MUCH larger maxWidth can get before getting to the next widest setting. A simple check can be done at this point
    to determine if the existing cached result can be used: if the height of the string at the new maxWidth is the same as the
    cached height, then we know the string didn't fit onto one fewer line, so return the cached value. If we did this check, we
    could return very quickly after only one string measurement, but EACH time we increase the maxWidth we'll have to do a new
    string measurement to check that we didn't end up with horizontal room for one fewer line. Because of this, instead of doing
    the check, the function will perform its binary search to go all the way UP to the minimum maxWidth at which one fewer line
    can be used to fit the text. After caching this value, all subsequent calls to the function will result in no string
    measurements as long as all the maxWidths are within the interval determined to lead to the cached result. So, the second call
    can in some cases be more expensive than it needs to be, but this saves A LOT of expense on all subsequent calls. The less
    often one calls metricsForString, the happier one's life is.

    The amount of time this function will take ranges from 0 to maybe 35ms on an old, slow machine, and, when used for window
    resizing, you'll see 35, 20, 0, 0, 0, ..., 0, 0, 35, 0, 0, 0, ..., 0, 0, 35, 0, 0, 0, ..., 0, 0, 0, 35, 0, 0, 0, ...
    After resizing through all the different caching intervals, the function will always execute quickly... under 1ms nearly always.
    The expensive calls are when a caching interval is crossed and a new cached set of metrics for the new number of lines of text
    must be calculated. And in reality, the number of sub-millisecond function calls will be much greater relative to the number
    of expensive calls, because window resizing just works like that.

    @param {String} string The text whose width you wish to optimize within your maximum width preference.

    @param {Number} maxWidth The maximum width the text is allowed to span, period. Can have "px" afterwards. Need not be a whole
                             number. It will be stripped of "px", and/or rounded up to the nearest integer, if necessary.

    @param {Element/String} exampleElement The element whose styles will be used to measure the width and height of the string.
                                           You can pass a string of CSSText here if you wish, just as with SC.metricsForString.

    @param {String} [classNames] Optional. Any class names you wish to also put on the measurement element.

    @param {Boolean} [ignoreEscape] Optional. If true, HTML in your string will not be escaped. If false or omitted, any HTML
                                              characters will be escaped for the measurement. If it's omitted where it should be
                                              true for correct results, the metrics returned will usually be much bigger than
                                              otherwise required.
  */
  bestStringMetricsForMaxWidth: function(string,maxWidth,exampleElement,classNames,ignoreEscape) {
    if(!maxWidth) { SC.warn("When calling bestMetricsForWidth, the second argument, maxWidth, is required. There's no reason to call this without a maxWidth."); return undefined; }
    maxWidth = Math.ceil(parseFloat(maxWidth));
    var                me = arguments.callee,
              exIsElement = SC.typeOf(exampleElement||(exampleElement=""))!==SC.T_STRING,
            savedMaxWidth = exIsElement ? exampleElement.style.maxWidth : undefined,
                    cache = (!exIsElement || exampleElement.cacheableForMetrics) ?
                              SC.cacheSlotFor(exampleElement,classNames,ignoreEscape,string) :
                              undefined,
                 applyMax = exIsElement ?
                              (me._applyMaxToEl||(me._applyMaxToEl=function(el,width) { el.style.maxWidth = width+"px"; return el; })) :
                              (me._applyMaxToStr||(me._applyMaxToStr=function(str,width) { return str.replace(/max-width:[^;]*;/g,'') + " max-width:"+width+"px"; })),
                removeMax = exIsElement ?
                              (me._removeMaxFromEl||(me._removeMaxFromEl=function(el) { el.style.maxWidth = "none"; return el; })) :
                              (me._removeMaxFromStr||(me._removeMaxFromStr=function(str) { return str.replace(/max-width:[^;]*;/g,'') + " max-width:none"; })),
          searchingUpward = false;
    if(cache) {
      cache.list || (cache.list = [{width: Infinity, height:0}]);
      for(var i=1,l=cache.list.length,inner,outer,ret; i<l && !ret; i++) {
        inner = cache.list[i];
        outer = cache.list[i-1];
        if(!inner || !inner.width) continue;
        if(maxWidth>=inner.width) {
          if((outer && outer.width) || (maxWidth<=inner.maxWidth)) {
            // console.error('returning from cache,',CW.Anim.enumerate(inner));
            return inner;
          }
          // searchingUpward = true;  //commented because this is currently problematic. If this remains false, duplicate work will be done if increasing in maxWidth since previous calls, but at least the results will be correct.
          ret = inner;
        }
      }
    }
    var            exEl = applyMax(exampleElement,maxWidth),
                metrics = SC.metricsForString(string,exEl,classNames,ignoreEscape),
        necessaryHeight = metrics.height,
          oneLineHeight = cache ? cache.parent.height || (cache.parent.height=SC.metricsForString('W',exEl,classNames).height) : SC.metricsForString('W',exEl,classNames).height,
                  lines = Math.round( necessaryHeight / oneLineHeight );
    if(searchingUpward) { lines--; necessaryHeight=lines*oneLineHeight; }
    if(necessaryHeight > oneLineHeight) {
      var hi = searchingUpward ? Math.ceil(metrics.width*2.5) : metrics.width,
          lo = searchingUpward ? metrics.width : Math.floor(metrics.width/2.5),
          middle ,
          now = new Date()*1,
          count = 0;
      while(hi-lo>1 || (metrics.height>necessaryHeight&&!searchingUpward) || (metrics.height<necessaryHeight&&searchingUpward)) {
        count++;
        middle = (hi+lo)/2;
        exEl = applyMax(exEl,middle);
        metrics = SC.metricsForString(string,exEl,classNames,ignoreEscape);
        if(metrics.height>necessaryHeight) lo = middle;
        else                               hi = middle;
      }
      metrics.width = Math.ceil(middle);
      metrics.height = necessaryHeight;
      metrics.maxWidth = maxWidth;
      metrics.lineHeight = oneLineHeight;
      metrics.lines = lines;
      metrics.searchPerformed = true;
      metrics.searchTime = new Date()*1 - now;
      metrics.searchCount = count;
    } else {
      if(searchingUpward) metrics = SC.metricsForString(string,exEl=removeMax(exEl),classNames,ignoreEscape);
      metrics.maxWidth = maxWidth;
      metrics.lineHeight = oneLineHeight;
      metrics.lines = lines;
      metrics.searchPerformed = false;
    }
    metrics.browserCorrection = 0;
    if(SC.browser.isIE) metrics.browserCorrection = 1;
    if(SC.browser.isMozilla) metrics.browserCorrection = 1;
    metrics.width = Math.min(maxWidth,metrics.width+metrics.browserCorrection);
    if(cache) {
      var entry = cache.list[lines];
      if(entry && entry.maxWidth<maxWidth) entry.maxWidth = maxWidth;
      if(!entry) entry = cache.list[lines] = metrics;
    }
    if(exIsElement) exEl.style.maxWidth = savedMaxWidth;
    ret = searchingUpward ? ret : metrics;
    // console.error('returning at end'+(searchingUpward?" after searching upward and finding"+CW.Anim.enumerate(metrics):"")+'. Returned value is ',CW.Anim.enumerate(ret));
    return ret;
  },

  /**
    Supply any number of arguments of any type, and this function will return you a hash associated with all those arguments.
    Call it twice with the same arguments in the same order, and the hash is the same. This is great for getting out of
    calculations whose answers depend on many different variables.

    @param {anything} your-arguments Any set of arguments whatsoever. If the FIRST argument is an array (including Arguments
                                     arrays), all other arguments will be ignored and the array will be treated as if its
                                     values at its numerical indices were passed in themselves as individual arguments.
    @returns {Hash} A cached workspace mapped to the ordered *n*-tuple of arguments passed into it.
  */
  cacheSlotFor: function() {
    var     me = arguments.callee.caller,
          curr = me.cache || (me.cache={});
    if(!arguments[0]) return curr;
    var   args = (arguments[0] instanceof Array || arguments[0].callee) ? arguments[0] : arguments,
        length = args.length,
           arg ,
             i ;
    for(i=0; i<length; i++) {
      if(typeof (arg=args[i]) === "object")
        arg = SC.guidFor(arg);
      curr = curr[arg] || (curr[arg]={parent:curr});
    }
    return curr;
  },

  /**
    Returns a wrapped copy of your function that caches its results according to its arguments. This function itself is cached, so
    the function you receive when you pass in a particular function will always be the same function.

    How was does this function handle its own caching? Using itself, of course! :-D

    Use this only on functions without side effects you depend on, and only on functions whose outputs depend entirely on their
    arguments and on nothing else external to them that could change.
  */
  cachedVersionOf: function() {
    var ret = function(func) {
      var ret = function() {     var cache = SC.cacheSlotFor(arguments);
                                 return cache.result || (cache.result = arguments.callee.func.apply(this,arguments));    };
      ret.func = func;
      return ret;
    };
    return ret(ret);
  }()
});

/* >>>>>>>>>> BEGIN source/tasks/preload_bundle.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require("tasks/task");

// default callback
SC.didPreloadBundle = function() {};

/**
  @private
  A task that preloads a bundle, supplying a target and action to be called
  on bundle load completion.
*/
SC.PreloadBundleTask = SC.Task.extend({
  /**
    The identifier of the bundle to load.
  */
  bundle: null,
  
  /**
    The target to supply to SC.Module.loadModule.
  */
  target: "SC",
  
  /**
    The action to supply to SC.Module.loadModule.
  */
  action: "preloaded",
  
  run: function(queue) {
    var bundle;
    if (bundle = this.get("bundle")) {
      var st = Date.now();
      SC.Module.loadModule(this.get("bundle"), this.get("target"), this.get("action"));
    }
  }
});

/* >>>>>>>>>> BEGIN source/transitions/adjust_bounce_transition.js */
// ==========================================================================
// Project:   SproutCore
// Copyright: @2013 7x7 Software, Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


SC.mixin(SC.View,
  /** @scope SC.View */ {

  /** @class

    To modify the bounce animation, you may set the following transition
    options in `transitionAdjustOptions`:

      - bounces {Number} the number of bounce back iterations.  Default: 2
      - bounciness {Number} the bounce coefficient.  Default: 0.25
      - duration {Number} the number of seconds for the animation.  Default: 0.4

    @extends SC.ViewTransitionProtocol
    @see SC.View#animate for other timing functions.
    @since Version 1.10
  */
  BOUNCE_ADJUST: {

    /** @private */
    run: function (view, options, finalLayout) {
      var bounces = options.bounces || 2,
        bounciness = options.bounciness || 0.25,
        layout = view.get('layout'),
        frames = [],
        frameCount = (bounces * 2) + 1,
        duration,
        i;

      // Split the duration evenly per frame.
      duration = options.duration || 0.4;
      duration = duration / frameCount;

      // Construct the frame layouts.
      for (i = 0; i < frameCount; i++) {
        if (i % 2) {
          // Bounce back.
          frames[i] = { value: SC.clone(finalLayout), duration: duration, timing: 'ease-out' };
        } else {
          // Hit target.
          if (i === frameCount - 1) {
            frames[i] = { value: SC.clone(finalLayout), duration: duration, timing: 'ease-in-out' };
          } else {
            frames[i] = { value: SC.clone(finalLayout), duration: duration, timing: 'ease-in' };
          }
        }
      }

      // Adjust the bounce frame layouts.
      for (var key in finalLayout) {
        var finalValue = finalLayout[key],
          // The bounce is based on the "distance" to the final value and the bounciness value.
          bounce = Math.round((finalValue - layout[key]) * bounciness);

        // Adjust the layout property for each bounce.
        for (i = 0; i < bounces; i++) {
          // Pull out the bounce frames only.
          frames[(i * 2) + 1].value[key] = finalValue - bounce;

          // Cut back the bounce amount after each bounce
          bounce = Math.round(bounce * 0.5);
        }
      }

      var callback = function () {
        view.didTransitionAdjust();
      };

      // Animate through the frames.
      view._animateFrames(frames, callback, options.delay || 0);
    }
  }

});

/* >>>>>>>>>> BEGIN source/transitions/adjust_smooth_transition.js */
// ==========================================================================
// Project:   SproutCore
// Copyright: @2013 7x7 Software, Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


SC.mixin(SC.View,
  /** @scope SC.View */ {

  /** @class

    To modify the smooth animation, you may set the following transition
    options in `transitionAdjustOptions`:

      - duration {Number} the number of seconds for the animation.  Default: 0.4

    @extends SC.ViewTransitionProtocol
    @see SC.View#animate for other timing functions.
    @since Version 1.10
  */
  SMOOTH_ADJUST: {

    /** @private */
    run: function (view, options, finalLayout) {
      var key,
        value;

      view.animate(finalLayout, {
        delay: options.delay || 0,
        duration: options.duration || 0.4,
        timing: options.timing || 'ease'
      }, function (data) {
        this.didTransitionAdjust();
      });
    }
  }

});

/* >>>>>>>>>> BEGIN source/transitions/adjust_spring_transition.js */
// ==========================================================================
// Project:   SproutCore
// Copyright: @2013 7x7 Software, Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


SC.mixin(SC.View,
  /** @scope SC.View */ {

  /** @class

    To modify the spring animation, you may set the following transition
    options in `transitionAdjustOptions`:

      - springs {Number} the number of spring back iterations.  Default: 4
      - springiness {Number} the spring coefficient.  Default: 0.25
      - duration {Number} the number of seconds for the animation.  Default: 0.4

    @extends SC.ViewTransitionProtocol
    @see SC.View#animate for other timing functions.
    @since Version 1.10
  */
  SPRING_ADJUST: {

    /** @private */
    run: function (view, options, finalLayout) {
      var springs = options.springs || 4,
        springiness = options.springiness || 0.25,
        layout = view.get('layout'),
        frames = [],
        frameCount = springs + 1,
        duration,
        i;

      // Split the duration evenly per frame.
      duration = options.duration || 0.4;
      duration = duration / frameCount;

      // Construct the frame layouts.
      for (i = 0; i < frameCount; i++) {
        if (i !== 0) {
          frames[i] = { value: SC.clone(finalLayout), duration: duration, timing: 'ease-in-out' };
        } else {
          frames[i] = { value: SC.clone(finalLayout), duration: duration, timing: 'ease-out' };
        }
      }

      // Adjust the spring frame layouts.
      for (var key in finalLayout) {
        var finalValue = finalLayout[key],
          // The spring is based on the "distance" to the final value and the springiness value.
          spring = Math.round((finalValue - layout[key]) * springiness);

        // Adjust the layout property for each spring.
        for (i = 0; i < springs; i++) {
          if (i % 2) {
            frames[i].value[key] = finalValue - spring; // Overshoot back.
          } else {
            frames[i].value[key] = finalValue + spring; // Overshoot forward.
          }

          // Cut back the spring amount after each spring
          spring = Math.round(spring * 0.5);
        }
      }

      var callback = function () {
        view.didTransitionAdjust();
      };

      // Animate through the frames.
      view._animateFrames(frames, callback, options.delay || 0);
    }
  }

});

/* >>>>>>>>>> BEGIN source/transitions/bounce_transition.js */
// ==========================================================================
// Project:   SproutCore
// Copyright: @2013 7x7 Software, Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


SC.mixin(SC.View,
  /** @scope SC.View */ {

 /** @class

    @extends SC.ViewTransitionProtocol
    @since Version 1.10
  */
  BOUNCE_IN: {

    /** @private */
    setup: function (view, options, inPlace) {
      var parentView = view.get('parentView'),
        parentFrame,
        viewFrame = view.get('borderFrame'),
        left,
        top;


      if (inPlace) {
        // Move from the current position.
      } else {
        // If there is no parentView, use the window's frame.
        if (parentView) {
          parentFrame = parentView.get('borderFrame');
        } else {
          parentFrame = SC.RootResponder.responder.currentWindowSize;
        }

        switch (options.direction) {
        case 'left':
          left = parentFrame.width;
          break;
        case 'up':
          top = parentFrame.height;
          break;
        case 'down':
          top = -viewFrame.height;
          break;
        default:
          left = -viewFrame.width;
        }
      }

      view.adjust({ centerX: null, centerY: null, bottom: null, left: left || viewFrame.x, right: null, top: top || viewFrame.y, height: viewFrame.height, width: viewFrame.width });
    },

    /** @private */
    run: function (view, options, finalLayout, finalFrame) {
      var layout = view.get('layout'),
        bounciness = options.bounciness || 0.25,
        bounce,
        duration,
        frames,
        finalValue,
        value, bounce1, bounce2;

      switch (options.direction) {
      case 'left':
        finalValue = finalFrame.x;
        value = { left: finalValue };
        bounce = -(finalValue - layout.left) * bounciness;
        bounce1 = { left: finalValue + bounce };
        bounce2 = { left: finalValue + (bounce * 0.5) };
        break;
      case 'up':
        finalValue = finalFrame.y;
        value = { top: finalValue };
        bounce = -(finalValue - layout.top) * bounciness;
        bounce1 = { top: finalValue + bounce };
        bounce2 = { top: finalValue + (bounce * 0.5) };
        break;
      case 'down':
        finalValue = finalFrame.y;
        value = { top: finalValue };
        bounce = (layout.top - finalValue) * bounciness;
        bounce1 = { top: finalValue + bounce };
        bounce2 = { top: finalValue + (bounce * 0.5) };
        break;
      default:
        finalValue = finalFrame.x;
        value = { left: finalValue };
        bounce = (layout.left - finalValue) * bounciness;
        bounce1 = { left: finalValue + bounce };
        bounce2 = { left: finalValue + (bounce * 0.5) };
      }

      // Split the duration evenly per frame.
      duration = options.duration || 0.4;
      duration = duration * 0.2;

      // Define the frames.
      frames = [
        { value: value, duration: duration, timing: 'ease-in' },
        { value: bounce1, duration: duration, timing: 'ease-out' },
        { value: value, duration: duration, timing: 'ease-in' },
        { value: bounce2, duration: duration, timing: 'ease-out' },
        { value: value, duration: duration, timing: 'ease-in-out' }
      ];

      var callback = function () {
        view.didTransitionIn();
      };

      // Animate through the frames.
      view._animateFrames(frames, callback, options.delay || 0);
    }
  },


  /** @class

    @extends SC.ViewTransitionProtocol
    @since Version 1.10
  */
  BOUNCE_OUT: {

    /** @private */
    setup: function (view, options) {
      var viewFrame = view.get('borderFrame'),
        left = viewFrame.x,
        top = viewFrame.y,
        height = viewFrame.height,
        width = viewFrame.width;

      view.adjust({ centerX: null, centerY: null, bottom: null, left: left, right: null, top: top, height: height, width: width });
    },

    /** @private */
    run: function (view, options, finalLayout, finalFrame) {
      var bounciness = options.bounciness || 0.25,
        bounce,
        bounceValue,
        bounceValue2,
        duration,
        finalValue,
        frames,
        layout = view.get('layout'),
        viewFrame = view.get('borderFrame'),
        parentView = view.get('parentView'),
        parentFrame,
        startValue;

      // If there is no parentView, use the window's frame.
      if (parentView) {
        parentFrame = parentView.get('borderFrame');
      } else {
        parentFrame = SC.RootResponder.responder.currentWindowSize;
      }

      switch (options.direction) {
      case 'left':
        startValue = { left: layout.left };
        finalValue = { left: -viewFrame.width };
        bounce = (layout.left + viewFrame.width) * bounciness;
        bounceValue = { left: layout.left - (bounce * 0.5) };
        bounceValue2 = { left: layout.left - bounce };
        break;
      case 'up':
        startValue = { top: layout.top };
        finalValue = { top: -viewFrame.height };
        bounce = (layout.top + viewFrame.height) * bounciness;
        bounceValue = { top: layout.top - (bounce * 0.5) };
        bounceValue2 = { top: layout.top - bounce };
        break;
      case 'down':
        startValue = { top: layout.top };
        finalValue = { top: parentFrame.height };
        bounce = (parentFrame.height - layout.top) * bounciness;
        bounceValue = { top: layout.top + (bounce * 0.5) };
        bounceValue2 = { top: layout.top + bounce };
        break;
      default:
        startValue = { left: layout.left };
        finalValue = { left: parentFrame.width };
        bounce = (parentFrame.width - layout.left) * bounciness;
        bounceValue = { left: layout.left + (bounce * 0.5) };
        bounceValue2 = { left: layout.left + bounce };
      }

      // Split the duration evenly per frame.
      duration = options.duration || 0.6;
      duration = duration * 0.2;

      // Define the frames.
      frames = [
        { value: bounceValue, duration: duration, timing: 'ease-out' },
        { value: startValue, duration: duration, timing: 'ease-in' },
        { value: bounceValue2, duration: duration, timing: 'ease-out' },
        { value: startValue, duration: duration, timing: 'ease-in-out' },
        { value: finalValue, duration: duration, timing: 'ease-in' }
      ];

      var callback = function () {
        view.didTransitionOut();
      };

      // Animate through the frames.
      view._animateFrames(frames, callback, options.delay || 0);
    }

  }

});

/* >>>>>>>>>> BEGIN source/transitions/fade_transition.js */
// ==========================================================================
// Project:   SproutCore
// Copyright: @2013 7x7 Software, Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


SC.mixin(SC.View,
  /** @scope SC.View */ {

  /** @class

    @extends SC.ViewTransitionProtocol
    @see SC.View#animate for other timing functions.
    @since Version 1.10
  */
  FADE_IN: {

    /** @private */
    setup: function (view, options, inPlace) {
      view.adjust({ opacity: inPlace ? view.get('layout').opacity || 0 : 0 });
    },

    /** @private */
    run: function (view, options, finalLayout, finalFrame) {
      view.animate('opacity', finalLayout.opacity || 1, {
        delay: options.delay || 0,
        duration: options.duration || 0.4,
        timing: options.timing || 'ease'
      }, function (data) {
        this.didTransitionIn();
      });
    }
  },

  /** @class

    @extends SC.ViewTransitionProtocol
    @see SC.View#animate for other timing functions.
    @since Version 1.10
  */
  FADE_OUT: {

    /** @private */
    run: function (view, options) {
      view.animate('opacity', 0, {
        delay: options.delay || 0,
        duration: options.duration || 0.4,
        timing: options.timing || 'ease'
      }, function (data) {
        this.didTransitionOut();
      });
    }

  }

});

/* >>>>>>>>>> BEGIN source/transitions/pop_transition.js */
// ==========================================================================
// Project:   SproutCore
// Copyright: @2013 7x7 Software, Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


SC.mixin(SC.View,
  /** @scope SC.View */ {

  /** @class

    @extends SC.ViewTransitionProtocol
    @since Version 1.10
  */
  POP_IN: {
    /** @private */
    setup: function (view, options, inPlace) {
      view.adjust({ scale: inPlace ? view.get('layout').scale || 0 : 0 });
    },

    /** @private */
    run: function (view, options, finalLayout, finalFrame) {
      var bigScale,
        duration,
        frames,
        poppiness = options.poppiness || 0.2,
        scale;

      scale = finalLayout.scale || 1;
      bigScale = scale * (poppiness + 1);

      duration = options.duration || 0.25;

      frames = [
        { value: { scale: bigScale }, duration: duration * 0.6, timing: 'ease-out' },
        { value: { scale: scale }, duration: duration * 0.4, timing: 'ease-in-out' }
      ];

      var callback = function () {
        view.didTransitionIn();
      };

      // Animate through the frames.
      view._animateFrames(frames, callback, options.delay || 0);
    }
  },

  /** @class

    @extends SC.ViewTransitionProtocol
    @since Version 1.10
  */
  POP_OUT: {

    /** @private */
    run: function (view, options) {
      var bigScale,
        duration,
        frames,
        poppiness = options.poppiness || 0.15,
        scale;

      scale = view.get('layout').scale || 1;
      bigScale = scale * (poppiness + 1);

      duration = options.duration || 0.2;

      frames = [
        { value: { scale: bigScale }, duration: duration * 0.4, timing: 'ease-out' },
        { value: { scale: 0 }, duration: duration * 0.6, timing: 'ease-in-out' }
      ];

      var callback = function () {
        view.didTransitionOut();
      };

      // Animate through the frames.
      view._animateFrames(frames, callback, options.delay || 0);
    }
  }
});

/* >>>>>>>>>> BEGIN source/transitions/scale_transition.js */
// ==========================================================================
// Project:   SproutCore
// Copyright: @2013 7x7 Software, Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


SC.mixin(SC.View,
  /** @scope SC.View */ {

  /** @class

    @extends SC.ViewTransitionProtocol
    @since Version 1.10
  */
  SCALE_IN: {

    /** @private */
    setup: function (view, options, inPlace) {
      view.adjust({ scale: inPlace ? view.get('layout').scale || 0 : 0 });
    },

    /** @private */
    run: function (view, options, finalLayout, finalFrame) {
      view.animate('scale', finalLayout.scale || 1, {
        delay: options.delay || 0,
        duration: options.duration || 0.4,
        timing: options.timing || 'ease'
      }, function (data) {
        this.didTransitionIn();
      });
    }
  },

  /** @class

    @extends SC.ViewTransitionProtocol
    @since Version 1.10
  */
  SCALE_OUT: {

    /** @private */
    run: function (view, options) {
      view.animate('scale', 0, {
        delay: options.delay || 0,
        duration: options.duration || 0.4,
        timing: options.timing || 'ease'
      }, function (data) {
        this.didTransitionOut();
      });
    }

  }
});

/* >>>>>>>>>> BEGIN source/transitions/slide_transition.js */
// ==========================================================================
// Project:   SproutCore
// Copyright: @2013 7x7 Software, Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


SC.mixin(SC.View,
  /** @scope SC.View */ {

  /** @class

    @extends SC.ViewTransitionProtocol
    @see SC.View#animate for other timing functions.
    @since Version 1.10
  */
  SLIDE_IN: {

    /** @private Starts from outside of parent unless inPlace is true. */
    setup: function (view, options, inPlace) {
      var parentView = view.get('parentView'),
        parentFrame,
        viewFrame = view.get('borderFrame'),
        left,
        top;

      if (inPlace) {
        // Move from the current position.
      } else {
        // If there is no parentView, use the window's frame.
        if (parentView) {
          parentFrame = parentView.get('borderFrame');
        } else {
          parentFrame = SC.RootResponder.responder.currentWindowSize;
        }

        switch (options.direction) {
        case 'left':
          left = parentFrame.width;
          break;
        case 'up':
          top = parentFrame.height;
          break;
        case 'down':
          top = -viewFrame.height;
          break;
        default:
          left = -viewFrame.width;
        }
      }

      // Convert to a HW accelerate-able layout.
      view.adjust({ centerX: null, centerY: null, bottom: null, left: left || viewFrame.x, right: null, top: top || viewFrame.y, height: viewFrame.height, width: viewFrame.width });
    },

    /** @private */
    run: function (view, options, finalLayout, finalFrame) {
      var key,
        value;

      if (options.direction === 'up' || options.direction === 'down') {
        key = 'top';
        value = finalFrame.y;
      } else {
        key = 'left';
        value = finalFrame.x;
      }

      view.animate(key, value, {
        delay: options.delay || 0,
        duration: options.duration || 0.4,
        timing: options.timing || 'ease'
      }, function (data) {
        this.didTransitionIn();
      });
    }
  },

  /** @class

    @extends SC.ViewTransitionProtocol
    @see SC.View#animate for other timing functions.
    @since Version 1.10
  */
  SLIDE_OUT: {

    /** @private Starts from current position. */
    setup: function (view, options) {
      var viewFrame = view.get('borderFrame'),
        left = viewFrame.x,
        top = viewFrame.y,
        height = viewFrame.height,
        width = viewFrame.width;

      view.adjust({ centerX: null, centerY: null, bottom: null, left: left, right: null, top: top, height: height, width: width });
    },

    /** @private */
    run: function (view, options, finalLayout, finalFrame) {
      var viewFrame = view.get('borderFrame'),
        parentView = view.get('parentView'),
        parentFrame,
        key, value;

      // If there is no parentView, use the window's frame.
      if (parentView) {
        parentFrame = parentView.get('borderFrame');
      } else {
        parentFrame = SC.RootResponder.responder.currentWindowSize;
      }

      switch (options.direction) {
      case 'left':
        key = 'left';
        value = -viewFrame.width;
        break;
      case 'up':
        key = 'top';
        value = -viewFrame.height;
        break;
      case 'down':
        key = 'top';
        value = parentFrame.height;
        break;
      default:
        key = 'left';
        value = parentFrame.width;
      }

      view.animate(key, value, {
        delay: options.delay || 0,
        duration: options.duration || 0.4,
        timing: options.timing || 'ease'
      }, function (data) {
        this.didTransitionOut();
      });
    }
  }

});

/* >>>>>>>>>> BEGIN source/transitions/spring_transition.js */
// ==========================================================================
// Project:   SproutCore
// Copyright: @2013 7x7 Software, Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


SC.mixin(SC.View,
  /** @scope SC.View */ {

  /** @class

    @extends SC.ViewTransitionProtocol
    @since Version 1.10
  */
  SPRING_IN: {

    /** @private */
    setup: function (view, options, inPlace) {
      var parentView = view.get('parentView'),
        parentFrame,
        viewFrame = view.get('borderFrame'),
        left,
        top;

      if (inPlace) {
        // Move from the current position.
      } else {
        // If there is no parentView, use the window's frame.
        if (parentView) {
          parentFrame = parentView.get('borderFrame');
        } else {
          parentFrame = SC.RootResponder.responder.currentWindowSize;
        }

        switch (options.direction) {
        case 'left':
          left = parentFrame.width;
          break;
        case 'up':
          top = parentFrame.height;
          break;
        case 'down':
          top = -viewFrame.height;
          break;
        default:
          left = -viewFrame.width;
        }
      }

      view.adjust({ centerX: null, centerY: null, bottom: null, left: left || viewFrame.x, right: null, top: top || viewFrame.y, height: viewFrame.height, width: viewFrame.width });
    },

    /** @private */
    run: function (view, options, finalLayout, finalFrame) {
      var layout = view.get('layout'),
        springiness = options.springiness || 0.25,
        spring,
        duration,
        frames,
        finalValue,
        spring1, spring2, spring3,
        value;

      switch (options.direction) {
      case 'left':
        finalValue = finalFrame.x;
        value = { left: finalValue };
        spring = (layout.left - finalValue) * springiness;
        spring1 = { left: finalValue - spring };
        spring2 = { left: finalValue + (spring * 0.5) };
        spring3 = { left: finalValue - (spring * 0.25) };
        break;
      case 'up':
        finalValue = finalFrame.y;
        value = { top: finalValue };
        spring = (layout.top - finalValue) * springiness;
        spring1 = { top: finalValue - spring };
        spring2 = { top: finalValue + (spring * 0.5) };
        spring3 = { top: finalValue - (spring * 0.25) };
        break;
      case 'down':
        finalValue = finalFrame.y;
        value = { top: finalValue };
        spring = (finalValue - layout.top) * springiness;
        spring1 = { top: finalValue + spring };
        spring2 = { top: finalValue - (spring * 0.5) };
        spring3 = { top: finalValue + (spring * 0.25) };
        break;
      default:
        finalValue = finalFrame.x;
        value = { left: finalValue };
        spring = (finalValue - layout.left) * springiness;
        spring1 = { left: finalValue + spring };
        spring2 = { left: finalValue - (spring * 0.5) };
        spring3 = { left: finalValue + (spring * 0.25) };
      }

      // Split the duration evenly per frame.
      duration = options.duration || 0.4;
      duration = duration * 0.25;

      // Define the frames.
      frames = [
        { value: spring1, duration: duration, timing: 'ease-out' }, // Overshoot.
        { value: spring2, duration: duration, timing: 'ease-in-out' }, // Overshoot back.
        { value: spring3, duration: duration, timing: 'ease-in-out' }, // Overshoot.
        { value: value, duration: duration, timing: 'ease-in-out' } // Hit target.
      ];

      var callback = function () {
        view.didTransitionIn();
      };

      // Animate through the frames.
      view._animateFrames(frames, callback, options.delay || 0);
    }
  },

  /** @class

    @extends SC.ViewTransitionProtocol
    @since Version 1.10
  */
  SPRING_OUT: {

    /** @private */
    setup: function (view, options) {
      var viewFrame = view.get('borderFrame'),
        left = viewFrame.x,
        top = viewFrame.y,
        height = viewFrame.height,
        width = viewFrame.width;

      view.adjust({ centerX: null, centerY: null, bottom: null, left: left, right: null, top: top, height: height, width: width });
    },

    /** @private */
    run: function (view, options, finalLayout, finalFrame) {
      var springiness = options.springiness || 0.25,
        duration,
        finalValue,
        frames,
        layout = view.get('layout'),
        viewFrame = view.get('borderFrame'),
        parentView = view.get('parentView'),
        parentFrame,
        spring,
        spring1, spring2;

      // If there is no parentView, use the window's frame.
      if (parentView) {
        parentFrame = parentView.get('borderFrame');
      } else {
        parentFrame = SC.RootResponder.responder.currentWindowSize;
      }

      switch (options.direction) {
      case 'left':
        finalValue = { left: -viewFrame.width };
        spring = (layout.left + viewFrame.width) * springiness;
        spring1 = { left: layout.left - (spring * 0.5) };
        spring2 = { left: layout.left + spring };
        break;
      case 'up':
        finalValue = { top: -viewFrame.height };
        spring = (layout.top + viewFrame.height) * springiness;
        spring1 = { top: layout.top - (spring * 0.5) };
        spring2 = { top: layout.top + spring };
        break;
      case 'down':
        finalValue = { top: parentFrame.height };
        spring = (parentFrame.height - layout.top) * springiness;
        spring1 = { top: layout.top + (spring * 0.5) };
        spring2 = { top: layout.top - spring };
        break;
      default:
        finalValue = { left: parentFrame.width };
        spring = (parentFrame.width - layout.left) * springiness;
        spring1 = { left: layout.left + (spring * 0.5) };
        spring2 = { left: layout.left - spring };
      }

      // Split the duration evenly per frame.
      duration = options.duration || 0.3;
      duration = duration * 0.33;

      // Define the frames.
      frames = [
        { value: spring1, duration: duration, timing: 'ease-in-out' },
        { value: spring2, duration: duration, timing: 'ease-in-out' },
        { value: finalValue, duration: duration, timing: 'ease-in' }
      ];

      var callback = function () {
        view.didTransitionOut();
      };

      // Animate through the frames.
      view._animateFrames(frames, callback, options.delay || 0);
    }
  }
});

/* >>>>>>>>>> BEGIN source/views/container.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


/** @class

  A container view will display its "content" view as its only child.  You can
  use a container view to easily swap out views on your page.  In addition to
  displaying the actual view in the content property, you can also set the
  nowShowing property to the property path of a view in your page and the
  view will be found and swapped in for you.

  # Animated Transitions

  To animate the transition between views, you can provide a transitionSwap
  plugin to SC.ContainerView.  There are several common transitions pre-built
  and if you want to create your own, the SC.ViewTransitionProtocol defines the
  methods to implement.

  The transitions included with SC.ContainerView are:

    - SC.ContainerView.DISSOLVE - fades between the two views
    - SC.ContainerView.FADE_COLOR - fades out to a color and then in to the new view
    - SC.ContainerView.MOVE_IN - moves the new view in over top of the old view
    - SC.ContainerView.PUSH - pushes the old view out with the new view
    - SC.ContainerView.REVEAL - moves the old view out revealing the new view underneath

  To use a transitionSwap plugin, simply set it as the value of the container view's
  `transitionSwap` property.

  For example,

      container = SC.ContainerView.create({
        transitionSwap: SC.ContainerView.PUSH
      });

  Since each transitionSwap plugin predefines a unique animation, SC.ContainerView
  provides the transitionSwapOptions property to allow for modifications to the
  animation.

  For example,

      container = SC.ContainerView.create({
        transitionSwap: SC.ContainerView.PUSH,
        transitionSwapOptions: {
          duration: 1.25,    // Use a longer duration then default
          direction: 'up'    // Push the old content up
        }
      });

  All the predefined transitionSwap plugins take options to modify the default
  duration and timing of the animation and to see what other options are
  available, refer to the documentation of the plugin.

  @extends SC.View
  @since SproutCore 1.0
*/
SC.ContainerView = SC.View.extend(
  /** @scope SC.ContainerView.prototype */ {

  // ------------------------------------------------------------------------
  // Properties
  //

  /**
    @type Array
    @default ['sc-container-view']
    @see SC.View#classNames
    @see SC.Object#concatenatedProperties
  */
  classNames: ['sc-container-view'],

  /**
    The content view to display.  This will become the only child view of
    the view.  Note that if you set the nowShowing property to any value other
    than 'null', the container view will automatically change the contentView
    to reflect view indicated by the value.

    @type SC.View
    @default null
  */
  contentView: null,

  /** @private */
  contentViewBindingDefault: SC.Binding.single(),

  /**
    Whether the container view is in the process of transitioning or not.

    You should observe this property in order to delay any updates to the new
    content until the transition is complete.

    @type Boolean
    @default false
    @since Version 1.10
  */
  isTransitioning: NO,

  /**
    Optional path name for the content view.  Set this to a property path
    pointing to the view you want to display.  This will automatically change
    the content view for you. If you pass a relative property path or a single
    property name, then the container view will look for it first on its page
    object then relative to itself. If you pass a full property name
    (e.g. "MyApp.anotherPage.anotherView"), then the path will be followed
    from the top-level.

    @type String|SC.View
    @default null
  */
  nowShowing: null,

  /** @private */
  renderDelegateName: 'containerRenderDelegate',

  /**
    The transitionSwap plugin to use when swapping views.

    SC.ContainerView uses a pluggable transition architecture where the
    transition setup, animation and cleanup can be handled by a specified
    transitionSwap plugin.

    There are a number of pre-built plugins available:

      SC.ContainerView.DISSOLVE
      SC.ContainerView.FADE_COLOR
      SC.ContainerView.MOVE_IN
      SC.ContainerView.PUSH
      SC.ContainerView.REVEAL

    You can even provide your own custom transitionSwap plugins.  Just create an
    object that conforms to the SC.SwapTransitionProtocol protocol.

    @type Object (SC.SwapTransitionProtocol)
    @default null
    @since Version 1.10
  */
  transitionSwap: null,

  /**
    The options for the given transitionSwap plugin.

    These options are specific to the current transitionSwap plugin used and are
    used to modify the transition animation.  To determine what options
    may be used for a given transition and to see what the default options are,
    see the documentation for the transition plugin being used.

    Most transitions will accept a duration and timing option, but may
    also use other options.  For example, SC.ContainerView.PUSH accepts options
    like:

        transitionSwapOptions: {
          direction: 'left',
          duration: 0.25,
          timing: 'linear'
        }

    @type Object
    @default null
    @since Version 1.10
  */
  transitionSwapOptions: null,

  // ------------------------------------------------------------------------
  // Methods
  //

  /** @private */
  init: function () {
    var view;

    arguments.callee.base.apply(this,arguments);

    if (this.get('nowShowing')) {
      // If nowShowing is directly set, invoke the instantiation of
      // it as well.
      this.nowShowingDidChange();
    } else {
      // If contentView is directly set, then swap it into nowShowing so that it
      // is properly instantiated and ready for swapping.
      // Fixes: https://github.com/sproutcore/sproutcore/issues/1069
      view = this.get('contentView');

      if (view) {
        this.set('nowShowing', view);
      }
    }
  },

  /** @private
    Overridden to prevent clipping of child views while animating.

    In particular, collection views have trouble being animated in a certain
    manner if they think their clipping frame hides themself.  For example,
    the PUSH transition returns a double width/height frame with an adjusted
    left/top while the transition is in process so neither view thinks it
    is clipped.
   */
  clippingFrame: function () {
    var contentStatecharts = this._contentStatecharts,
      frame = this.get('frame'),
      ret = arguments.callee.base.apply(this,arguments);

    // Allow for a modified clippingFrame while transitioning.
    if (this.get('isTransitioning')) {
      // Each transition may adjust the clippingFrame to accommodate itself.
      for (var i = contentStatecharts.length - 1; i >= 0; i--) {
        ret = contentStatecharts[i].transitionClippingFrame(ret);
      }
    } else {
      ret.width = frame.width;
    }

    return ret;
  }.property('parentView', 'frame').cacheable(),

  /** @private
    Invoked whenever the content property changes.  This method will simply
    call replaceContent.  Override replaceContent to change how the view is
    swapped out.
  */
  contentViewDidChange: function () {
    this.replaceContent(this.get('contentView'));
  }.observes('contentView'),

  /** @private */
  destroy: function () {
    var contentStatecharts = this._contentStatecharts;

    // Exit all the statecharts immediately. This mutates the array!
    if (contentStatecharts) {
      for (var i = contentStatecharts.length - 1; i >= 0; i--) {
        contentStatecharts[i].doExit(true);
      }
    }

    // Remove our internal reference to the statecharts.
    this._contentStatecharts = this._currentStatechart = null;

    return arguments.callee.base.apply(this,arguments);
  },

  /** @private
    Invoked whenever the nowShowing property changes.  This will try to find
    the new content if possible and set it.  If you set nowShowing to an
    empty string or null, then the current content will be cleared.
  */
  nowShowingDidChange: function () {
    // This code turns this.nowShowing into a view object by any means necessary.
    var content = this.get('nowShowing');

    // If it's a string, try to turn it into the object it references...
    if (SC.typeOf(content) === SC.T_STRING && content.length > 0) {
      if (content.indexOf('.') > 0) {
        content = SC.objectForPropertyPath(content);
      } else {
        var tempContent = this.getPath(content);
        content = SC.kindOf(tempContent, SC.CoreView) ? tempContent : SC.objectForPropertyPath(content, this.get('page'));
      }
    }

    // If it's an uninstantiated view, then attempt to instantiate it.
    if (content && content.kindOf(SC.CoreView)) {
      content = this.createChildView(content);
    } else {
      content = null;
    }

    // Sets the content.
    this.set('contentView', content);
  }.observes('nowShowing'),

  /** @private Called by new content statechart to indicate that it is ready. */
  statechartReady: function () {
    var contentStatecharts = this._contentStatecharts;

    // Exit all other remaining statecharts immediately.  This mutates the array!
    // This allows transitions where the previous content is left in place to
    // clean up all previous content once the new content transitions in.
    for (var i = contentStatecharts.length - 2; i >= 0; i--) {
      contentStatecharts[i].doExit(true);
    }

    this.set('isTransitioning', NO);
  },

  /** @private Called by content statecharts to indicate that they have exited. */
  statechartEnded: function (statechart) {
    var contentStatecharts = this._contentStatecharts;

    // Remove the statechart.
    contentStatecharts.removeObject(statechart);

    // Once all the other statecharts have exited. Indicate that the current
    // statechart is entered. This allows transitions where the new
    // content is left in place to update state once all previous statecharts
    // have exited.
    if (contentStatecharts.length === 1) {
      contentStatecharts[0].entered();
    }
  },

  /** @private
    Replaces any child views with the passed new content.

    This method is automatically called whenever your contentView property
    changes.  You can override it if you want to provide some behavior other
    than the default.

    @param {SC.View} newContent the new content view or null.
  */
  replaceContent: function (newContent) {
    var contentStatecharts,
      currentStatechart = this._currentStatechart,
      newStatechart;

    // Track that we are transitioning.
    this.set('isTransitioning', YES);

    // Create a statechart for the new content.
    contentStatecharts = this._contentStatecharts;
    if (!contentStatecharts) { contentStatecharts = this._contentStatecharts = []; }

    // Call doExit on all current content statecharts.  Any statecharts in the
    // process of exiting may accelerate their exits.
    for (var i = contentStatecharts.length - 1; i >= 0; i--) {
      var found = contentStatecharts[i].doExit(false, newContent);

      // If the content already belongs to a content statechart reuse that statechart.
      if (found) {
        newStatechart = contentStatecharts[i];
        newStatechart.set('previousStatechart', currentStatechart);
        newStatechart.gotoEnteringState();
      }
    }

    // Add the new content statechart, which will enter automatically.
    if (!newStatechart) {
      newStatechart = SC.ContainerContentStatechart.create({
        container: this,
        content: newContent,
        previousStatechart: currentStatechart
      });

      contentStatecharts.pushObject(newStatechart);
    }

    // Track the current statechart.
    this._currentStatechart = newStatechart;
  }

});


// When in debug mode, core developers can log the container content states.

SC.LOG_CONTAINER_CONTENT_STATES = false;


/** @private
  In order to support transitioning views in and out of the container view,
  each content view needs its own simple statechart.  This is required, because
  while only one view will ever be transitioning in, several views may be in
  the process of transitioning out.  See the 'SC.ContainerView Statechart.graffle'
  file in the repository.
*/
SC.ContainerContentStatechart = SC.Object.extend({

  // ------------------------------------------------------------------------
  // Properties
  //

  container: null,

  content: null,

  previousStatechart: null,

  state: 'none',

  // ------------------------------------------------------------------------
  // Methods
  //

  init: function () {
    arguments.callee.base.apply(this,arguments);

    // Default entry state.
    this.gotoEnteringState();
  },

  transitionClippingFrame: function (clippingFrame) {
    var container = this.get('container'),
      options = container.get('transitionSwapOptions') || {},
      transitionSwap = container.get('transitionSwap');

    if (transitionSwap && transitionSwap.transitionClippingFrame) {
      return transitionSwap.transitionClippingFrame(container, clippingFrame, options);
    } else {
      return clippingFrame;
    }
  },

  // ------------------------------------------------------------------------
  // Actions & Events
  //

  entered: function () {
    
    if (SC.LOG_CONTAINER_CONTENT_STATES) {
      var container = this.get('container'),
        content = this.get('content');

      SC.Logger.log('%@ (%@)(%@, %@) — entered callback'.fmt(this, this.state, container, content));
    }
    

    if (this.state === 'entering') {
      this.gotoReadyState();
    }
  },

  doExit: function (immediately, newContent) {
    if (this.state !== 'exited') {
      this.gotoExitingState(immediately, newContent);
    
    } else {
      throw new Error('Developer Error: SC.ContainerView should not receive an internal doExit event while in exited state.');
    
    }

    // If the new content matches our own content, indicate this to the container.
    if (this.get('content') === newContent) {
      return true;
    } else {
      return false;
    }
  },

  exited: function () {
    
    if (SC.LOG_CONTAINER_CONTENT_STATES) {
      var container = this.get('container'),
        content = this.get('content');

      SC.Logger.log('%@ (%@)(%@, %@) — exited callback'.fmt(this, this.state, container, content));
    }
    

    if (this.state === 'exiting') {
      this.gotoExitedState();
    }
  },

  // ------------------------------------------------------------------------
  // States
  //

  // Entering
  gotoEnteringState: function () {
    var container = this.get('container'),
      content = this.get('content'),
      previousStatechart = this.get('previousStatechart'),
      options = container.get('transitionSwapOptions') || {},
      transitionSwap = container.get('transitionSwap');

    
    if (SC.LOG_CONTAINER_CONTENT_STATES) {
      SC.Logger.log('%@ (%@)(%@, %@) — Entering (Previous: %@)'.fmt(this, this.state, container, content, previousStatechart));
    }
    

    // If currently in the exiting state, reverse to entering.
    if (this.state === 'exiting' && transitionSwap.reverseBuildOut) {
      transitionSwap.reverseBuildOut(this, container, content, options);

      // Assign the state.
      this.set('state', 'entering');

      // Fast path!!
      return;
    } else if (content) {
      container.appendChild(content);
    }

    // Assign the state.
    this.set('state', 'entering');

    // Don't transition unless there is a previous statechart.
    if (previousStatechart && content && transitionSwap) {
      if (transitionSwap.willBuildInToView) {
        transitionSwap.willBuildInToView(container, content, previousStatechart, options);
      }

      if (transitionSwap.buildInToView) {
        transitionSwap.buildInToView(this, container, content, previousStatechart, options);
      } else {
        this.entered();
      }
    } else {
      this.entered();
    }
  },

  // Exiting
  gotoExitingState: function (immediately) {
    var container = this.get('container'),
      content = this.get('content'),
      exitCount = this._exitCount,
      options = container.get('transitionSwapOptions') || {},
      transitionSwap = container.get('transitionSwap');

    
    if (SC.LOG_CONTAINER_CONTENT_STATES) {
      if (!exitCount) { exitCount = this._exitCount = 1; }
      SC.Logger.log('%@ (%@)(%@, %@) — Exiting (x%@)'.fmt(this, this.state, container, content, this._exitCount));
    }
    

    // If currently in the entering state, reverse to exiting.
    if (this.state === 'entering' && transitionSwap.reverseBuildIn) {
      transitionSwap.reverseBuildIn(this, container, content, options);

      // Assign the state.
      this.set('state', 'exiting');

      // Fast path!!
      return;
    }

    // Assign the state.
    this.set('state', 'exiting');

    if (!immediately && content && transitionSwap) {
      // Re-entering the exiting state may need to accelerate the transition, pass the count to the plugin.
      if (!exitCount) { exitCount = this._exitCount = 1; }

      if (transitionSwap.willBuildOutFromView) {
        transitionSwap.willBuildOutFromView(container, content, options, exitCount);
      }

      if (transitionSwap.buildOutFromView) {
        transitionSwap.buildOutFromView(this, container, content, options, exitCount);
      } else {
        // this.exited();
      }

      // Increment the exit count each time doExit is called.
      this._exitCount += 1;
    } else {
      this.exited();
    }
  },

  // Exited
  gotoExitedState: function () {
    var container = this.get('container'),
      content = this.get('content'),
      options = container.get('transitionSwapOptions') || {},
      transitionSwap = container.get('transitionSwap');

    
    if (SC.LOG_CONTAINER_CONTENT_STATES) {
      SC.Logger.log('%@ (%@)(%@, %@) — Exited'.fmt(this, this.state, container, content));
    }
    

    if (content) {
      if (transitionSwap && transitionSwap.didBuildOutFromView) {
        transitionSwap.didBuildOutFromView(container, content, options);
      }

      if (content.createdByParent) {
        container.removeChildAndDestroy(content);
      } else {
        container.removeChild(content);
      }
    }

    // Send ended event to container view statechart.
    container.statechartEnded(this);

    // Reset the exiting count.
    this._exitCount = 0;

    // Assign the state.
    this.set('state', 'exited');
  },

  // Ready
  gotoReadyState: function () {
    var container = this.get('container'),
      content = this.get('content'),
      options = container.get('transitionSwapOptions') || {},
      transitionSwap = container.get('transitionSwap');

    
    if (SC.LOG_CONTAINER_CONTENT_STATES) {
      SC.Logger.log('%@ (%@)(%@, %@) — Entered'.fmt(this, this.state, container, content));
    }
    

    if (content && transitionSwap && transitionSwap.didBuildInToView) {
      transitionSwap.didBuildInToView(container, content, options);
    }

    // Send ready event to container view statechart.
    container.statechartReady();

    // Assign the state.
    this.set('state', 'ready');
  }

});

/* >>>>>>>>>> BEGIN source/transitions/swap_dissolve_transition.js */
// ==========================================================================
// Project:   SproutCore
// Copyright: @2013 7x7 Software, Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
sc_require('views/container');


SC.mixin(SC.ContainerView,
/** @scope SC.ContainerView */ {

  /** @class
    Provides dissolve transitions for SC.ContainerView.  The new content will
    fade in as the old content fades out of the view.

    To modify the dissolve animation, you can set the following transition
    options:

      - duration {Number} the number of seconds for the animation.  Default: 0.4
      - timing {String} the animation timing function.  Default: 'ease'

    @extends SC.ViewTransitionProtocol
    @see SC.View#animate for other timing functions.
    @since Version 1.10
  */
  DISSOLVE: {

    /** @private */
    willBuildInToView: function (container, content, previousStatechart, options) {
      content.adjust({ opacity: 0 });
    },

    /** @private */
    buildInToView: function (statechart, container, content, previousStatechart, options) {
      content.animate('opacity', 1, {
        duration: options.duration || 0.4,
        timing: options.timing || 'ease'
      }, function (data) {
        // We may already be in exiting state by the time we transition in.
        if (statechart.get('state') === 'entering') {
          statechart.entered();
        }
      });
    },

    /** @private */
    buildOutFromView: function (statechart, container, content, options, exitCount) {
      // We can call this transition repeatedly without effecting the current exit transition.
      if (exitCount == 1) {
        // Fade the current content at the same time.
        content.animate('opacity', 0, {
          duration: options.duration || 0.4,
          timing: options.timing || 'ease'
        }, function (data) {
          statechart.exited();
        });
      }
    },

    /** @private */
    didBuildOutFromView: function (container, content, options) {
      // Reset the opacity in case this view is used elsewhere.
      content.adjust({ opacity: 1 });
    }

  }
});

/* >>>>>>>>>> BEGIN source/transitions/swap_fade_color_transition.js */
// ==========================================================================
// Project:   SproutCore
// Copyright: @2013 7x7 Software, Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
sc_require('views/container');


SC.mixin(SC.ContainerView,
/** @scope SC.ContainerView */ {

 /** @class
    Provides fade through color transitions to SC.ContainerView.  The old
    content will fade out to a color and the new content will then fade in.

    To modify the fade through color animation, you can set the following
    transition options:

      - color {String} any valid CSS Color.  Default: 'black'
      - duration {Number} the number of seconds for the animation.  Default: 0.4
      - timing {String} the animation timing function.  Default: 'ease'

    @extends SC.ViewTransitionProtocol
    @see SC.View#animate for other timing functions.
    @since Version 1.10
  */
  FADE_COLOR: {

    /** @private */
    willBuildInToView: function (container, content, previousStatechart, options) {
      var color,
        colorView;

      content.adjust({ opacity: 0 });

      // Create a color view to fade through.
      color = SC.Color.from(options.color || 'black');
      colorView = SC.View.create({
        layout: { opacity: 0, zIndex: 1 },
        render: function (context) {
          context.addStyle('background-color', color.get('cssText'));
        }
      });
      container.appendChild(colorView);
    },

    /** @private */
    buildInToView: function (statechart, container, content, previousStatechart, options) {
      var childViews = container.get('childViews'),
        colorView;

      colorView = childViews.objectAt(childViews.get('length') - 1);

      // Fade the color in (uses half the total duration)
      colorView.animate('opacity', 1, {
        duration: options.duration * 0.5 || 0.4,
        timing: options.timing || 'ease-in'
      }, function () {
        // Show new content, then fade the color out.
        content.adjust('opacity', 1);

        colorView.animate('opacity', 0, {
          duration: options.duration * 0.5 || 0.4,
          timing: options.timing || 'ease-in'
        }, function (data) {
          // It's best to clean up the colorView here rather than try to find it again on teardown,
          // since multiple color views could be added.
          container.removeChild(this);
          this.destroy();

          // We may already be in exiting state by the time we transition in.
          if (statechart.get('state') === 'entering') {
            statechart.entered();
          }
        });
      });
    },

    /** @private */
    buildOutFromView: function (statechart, container, content, options, exitCount) {
      // Do nothing.
    }

  }

});

/* >>>>>>>>>> BEGIN source/transitions/swap_move_in_transition.js */
// ==========================================================================
// Project:   SproutCore
// Copyright: @2013 7x7 Software, Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
sc_require('views/container');


SC.mixin(SC.ContainerView,
/** @scope SC.ContainerView */ {

   /** @class
    Provides move in transitions to SC.ContainerView.  The new content will
    move in over top of the old content.

    To modify the move in animation, you can set the following transition
    options:

      - direction {String} the direction to move new content in.  Default: 'left'.
        ** 'left' - moves new content from the right to the left
        ** 'right' - moves new content from the left to the right
        ** 'up' - moves new content from the bottom to the top
        ** 'down' - moves new content from the top to the bottom
      - duration {Number} the number of seconds for the animation.  Default: 0.4
      - timing {String} the animation timing function.  Default: 'ease'

    @extends SC.ViewTransitionProtocol
    @see SC.View#animate for other timing functions.
    @since Version 1.10
  */
  MOVE_IN: {

    /** @private */
    willBuildInToView: function (container, content, previousStatechart, options) {
      var frame = container.get('frame'),
        left,
        top,
        height,
        width;

      height = frame.height;
      width = frame.width;

      switch (options.direction) {
      case 'right':
        left = -width;
        break;
      case 'up':
        top = height;
        break;
      case 'down':
        top = -height;
        break;
      default:
        left = width;
      }

      content.adjust({ bottom: null, left: left || 0, right: null, top: top || 0, height: height, width: width });
    },

    /** @private */
    buildInToView: function (statechart, container, content, previousStatechart, options) {
      var key,
        value;

      switch (options.direction) {
      case 'right':
        key = 'left';
        break;
      case 'up':
        key = 'top';
        break;
      case 'down':
        key = 'top';
        break;
      default:
        key = 'left';
      }

      content.animate(key, 0, {
        duration: options.duration || 0.4,
        timing: options.timing || 'ease'
      }, function (data) {
        // We may already be in exiting state by the time we transition in.
        if (statechart.get('state') === 'entering') {
          statechart.entered();
        }
      });
    },

    /** @private */
    didBuildInToView: function (container, content, options) {
      // Convert to a flexible layout.
      content.adjust({ bottom: 0, right: 0, height: null, width: null });
    },

    /** @private */
    didBuildOutFromView: function (container, content, options) {
      // Convert to a flexible layout (in case we never fully entered).
      content.adjust({ bottom: 0, right: 0, height: null, width: null });
    },

    /** @private */
    buildOutFromView: function (statechart, container, content, options) {
      // Do nothing.
    }
  }

});

/* >>>>>>>>>> BEGIN source/transitions/swap_push_transition.js */
// ==========================================================================
// Project:   SproutCore
// Copyright: @2013 7x7 Software, Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
sc_require('views/container');


SC.mixin(SC.ContainerView,
/** @scope SC.ContainerView */ {
  /** @class
    Provides push transitions to SC.ContainerView.  The new content will push
    the old content out of the view.

    To modify the push animation, you can set the following transition options:

      - direction {String} the direction to push new content in.  Default: 'left'
        ** 'left' - pushes new content from the right to the left
        ** 'right' - pushes new content from the left to the right
        ** 'up' - pushes new content from the bottom to the top
        ** 'down' - pushes new content from the top to the bottom
      - duration {Number} the number of seconds for the animation.  Default: 0.4
      - timing {String} the animation timing function.  Default: 'ease'

    @extends SC.ViewTransitionProtocol
    @see SC.View#animate for other timing functions.
    @since Version 1.10
  */
  PUSH: {

    /** @private */
    willBuildInToView: function (container, content, previousStatechart, options) {
      var adjustLeft = 0,
        adjustTop = 0,
        frame = container.get('frame'),
        left = 0,
        top = 0,
        height,
        width;

      height = frame.height;
      width = frame.width;

      // Push on to the edge of whatever the current position of previous content is.
      if (previousStatechart && previousStatechart.get('content')) {
        var adjustments = previousStatechart.getPath('content.liveAdjustments');

        adjustLeft = adjustments.left || 0;
        adjustTop = adjustments.top || 0;
      }

      switch (options.direction) {
      case 'right':
        left = -width + adjustLeft;
        break;
      case 'up':
        top = height + adjustTop;
        break;
      case 'down':
        top = -height + adjustTop;
        break;
      default:
        left = width + adjustLeft;
      }

      // Convert to an animatable layout.
      content.adjust({ bottom: null, right: null, left: left, top: top, height: height, width: width });
    },

    /** @private */
    buildInToView: function (statechart, container, content, previousStatechart, options) {
      var key;

      switch (options.direction) {
      case 'up':
        key = 'top';
        break;
      case 'down':
        key = 'top';
        break;
      default:
        key = 'left';
      }

      content.animate(key, 0, {
        duration: options.duration || 0.4,
        timing: options.timing || 'ease'
      }, function (data) {
        // We may already be in exiting state by the time we transition in.
        if (statechart.get('state') === 'entering') {
          statechart.entered();
        }
      });
    },

    /** @private */
    didBuildInToView: function (container, content, options) {
      // Convert to a flexible layout.
      content.adjust({ bottom: 0, right: 0, height: null, width: null });
    },

    /** @private */
    willBuildOutFromView: function (container, content, options) {
      var frame = container.get('frame'),
        height,
        width;

      height = frame.height;
      width = frame.width;

      // Convert to an animatable layout.
      content.adjust({ bottom: null, right: null, height: height, width: width });
    },

    /** @private */
    buildOutFromView: function (statechart, container, content, options, exitCount) {
      var frame = container.get('frame'),
        key,
        value;

      switch (options.direction) {
      case 'right':
        key = 'left';
        value = frame.width;
        break;
      case 'up':
        key = 'top';
        value = -frame.height;
        break;
      case 'down':
        key = 'top';
        value = frame.height;
        break;
      default:
        key = 'left';
        value = -frame.width;
      }

      content.animate(key, value * exitCount, {
        duration: options.duration || 0.4,
        timing: options.timing || 'ease'
      }, function (data) {
        if (!data.isCancelled) {
          statechart.exited();
        }
      });
    },

    /** @private */
    didBuildOutFromView: function (container, content, options) {
      // Convert to a flexible layout.
      content.adjust({ bottom: 0, right: 0, height: null, width: null });
    },

    /** @private */
    transitionClippingFrame: function (container, clippingFrame, options) {
      var frame = container.get('frame');

      switch (options.direction) {
      case 'right':
        clippingFrame.width = frame.width * 2;
        clippingFrame.x = -frame.width;
        break;
      case 'up':
        clippingFrame.height = frame.height * 2;
        clippingFrame.y = -frame.height;
        break;
      case 'down':
        clippingFrame.height = frame.height * 2;
        clippingFrame.y = 0;
        break;
      default:
        clippingFrame.width = frame.width * 2;
        clippingFrame.x = 0;
      }

      return clippingFrame;
    }
  }

});

/* >>>>>>>>>> BEGIN source/transitions/swap_reveal_transition.js */
// ==========================================================================
// Project:   SproutCore
// Copyright: @2013 7x7 Software, Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
sc_require('views/container');


SC.mixin(SC.ContainerView,
/** @scope SC.ContainerView */ {
  /** @class
    Provides reveal transitions to SC.ContainerView.  The old content will
    move out revealing the new content underneath.

    To modify the reveal animation, you can set the following transition
    options:

      - direction {String} The direction to move old content off.  Default: 'left'
        ** 'left' - moves old content off to the left
        ** 'right' - moves old content off to the right
        ** 'up' - moves old content off to the top
        ** 'down' - moves old content off to the bottom
      - duration {Number} the number of seconds for the animation.  Default: 0.4
      - timing {String} the animation timing function.  Default: 'ease'

    @extends SC.ViewTransitionProtocol
    @see SC.View#animate for other timing functions.
    @since Version 1.10
  */
  REVEAL: {

    /** @private */
    buildInToView: function (statechart, container, content, previousStatechart, options) {
      // This transition is unique in that we have to wait for the previous
      // content to finish building out entirely, before we can be considered
      // fully entered.
      // if (previousStatechart && previousStatechart.get('content')) {
      //   previousStatechart.addObserver('state', this, this.previousStateDidChange, statechart);
      // }
    },

    /** @private */
    // reverseBuildIn: function (statechart, container, content, options) {
    //   var nextStatechart = container._currentStatechart;

    //   // We were waiting for another view to remove itself previously, now
    //   // we are going out because someone else is coming in. If that someone
    //   // else was also going out, then we should stay put because they are
    //   // going to reverse.
    //   if (nextStatechart && nextStatechart.get('content')) {
    //     nextStatechart.addObserver('state', this, this.nextStateDidChange, statechart);
    //   }
    // },

    /** @private */
    // previousStateDidChange: function (previousStatechart, key, alwaysNull, statechart) {
    //   if (previousStatechart.state === 'exited') {
    //     statechart.entered();

    //     // Clean up.
    //     previousStatechart.removeObserver('state', this, this.previousStateDidChange);
    //   }
    // },

    /** @private */
    didBuildInToView: function (container, content, options) {
      // Convert to a flexible layout.
      content.adjust({ bottom: 0, right: 0, height: null, width: null, zIndex: null });
    },

    /** @private */
    willBuildOutFromView: function (container, content, options, exitCount) {
      var frame = container.get('frame'),
        height,
        width;

      height = frame.height;
      width = frame.width;

      // Convert to a fixed layout. Put this view on top.
      content.adjust({ bottom: null, right: null, height: height, width: width, zIndex: exitCount });
    },

    /** @private */
    buildOutFromView: function (statechart, container, content, options, exitCount) {
      // We can call this transition repeatedly without effecting the current exit transition.
      if (exitCount === 1) {
        var frame = container.get('frame'),
          key,
          value;

        switch (options.direction) {
        case 'right':
          key = 'left';
          value = -frame.width;
          break;
        case 'up':
          key = 'top';
          value = -frame.height;
          break;
        case 'down':
          key = 'top';
          value = frame.height;
          break;
        default:
          key = 'left';
          value = frame.width;
        }

        content.animate(key, value, {
          duration: options.duration || 0.4,
          timing: options.timing || 'ease'
        }, function (data) {
          if (!data.isCancelled) {
            statechart.exited();
          }
        });
      }
    },

    /** @private */
    // reverseBuildOut: function (statechart, container, content, options) {
    //   var key, value;

    //   // Cancel the animation in place.
    //   content.cancelAnimation(SC.LayoutState.CURRENT);

    //   switch (options.direction) {
    //   case 'up':
    //   case 'down':
    //     key = 'top';
    //     value = 0;
    //     break;
    //   default:
    //     key = 'left';
    //     value = 0;
    //   }

    //   content.animate(key, value, {
    //     duration: options.duration || 0.2,
    //     timing: options.timing || 'ease'
    //   }, function (data) {
    //     if (!data.isCancelled) {
    //       statechart.entered();
    //     }
    //   });
    // },

    /** @private */
    didBuildOutFromView: function (container, content, options) {
      // Convert to a flexible layout.
      content.adjust({ top: 0, left: 0, bottom: 0, right: 0, height: null, width: null, zIndex: null });
    }

  }

});

/* >>>>>>>>>> BEGIN source/validators/validator.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('system/string');

SC.VALIDATE_OK = YES;
SC.VALIDATE_NO_CHANGE = NO;

/**
  @class
  
  Validators provide a way for you to implement simple form field validation
  and transformation.  To use a validator, simply name the validator in the
  "validate" attribute in your text field.  For example, if you want to
  validate a field using the PhoneNumberValidator use this:

      <input value="1234567890" validate="phone-number" />

  Validators get notified at three points.  You can implement one or all
  of these methods to support validation.  All of the validate methods except
  for validateKeypress behave the same way.  You are passed a form, field,
  and possibly the oldValue.  You are expected to return Validator.OK or
  an error string.  Inside this method you typically do one of all of the
  following:

  1. You can simply validate the field value and return OK or an error str
  2. You can modify the field value (for example, you could format the
     string to match some predefined format).
  3. If you need to roundtrip the server first to perform validation, you can
     return Validator.OK, then save the form and field info until after the
     roundtrip.  On return, if there is a problem, first verify the field
     value has not changed and then call form.errorFor(field,str) ;

  @extends SC.Object
  @since SproutCore 1.0
*/
SC.Validator = SC.Object.extend(
/** @scope SC.Validator.prototype */ {

  // ..........................................
  // OBJECT VALUE CONVERSION
  //
  // The following methods are used to convert the string value of a field
  // to and from an object value.  The default implementations return
  // the string, but you can override this to provide specific behaviors. 
  // For example, you might add or remove a dollar sign or convert the 
  // value to a number.
  
/**
  Returns the value to set in the field for the passed object value.  
  
  The form and view to be set MAY (but will not always) be passed also.  You
  should override this method to help convert an input object into a value
  that can be displayed by the field.  For example, you might convert a 
  date to a property formatted string or a number to a properly formatted
  value.
  
  @param {Object} object The object to transform
  @param {SC.FormView} form The form this field belongs to. (optional)
  @param {SC.View} view The view the value is required for.
  @returns {Object} a value (usually a string) suitable for display
*/
  fieldValueForObject: function(object, form, view) { return object; },
  
  /**
    Returns the object value for the passed string.
    
    The form and view MAY (but wil not always) be passed also.  You should
    override this method to convert a field value, such as string, into an
    object value suitable for consumption by the rest of the app.  For example
    you may convert a string into a date or a number.
    
    @param {String} value the field value.  (Usually a String).
    @param {SC.FormView} form The form this field belongs to. (optional)
    @param {SC.View} view The view this value was pulled from.
    @returns {Object} an object suitable for consumption by the app.
  */
  objectForFieldValue: function(value, form, view) { return value; },
  
  // ..........................................
  // VALIDATION PRIMITIVES
  //

  /**
    Validate the field value.  
    
    You can implement standard behavior for your validator by using the validate()
    and validateError() methods.  validate() should return NO if the field is not
    valid, YES otherwise.  If you return NO from this method, then the validateError()
    method will be called so you can generate an error object describing the specific problem.

    @param {SC.FormView} form the form this view belongs to
    @param {SC.View} field the field to validate.  Responds to fieldValue.
    @returns {Boolean} YES if field is valid.
  */
  validate: function(form, field) { return true; },

  /**
    Returns an error object if the field is invalid.
  
    This is the other standard validator method that can be used to implement basic validation.
    Return an error object explaining why the field is not valid.  It will only be called if
    validate() returned NO.
    
    The default implementation of this method returns a generic error message with the loc
    string "Invalid.Generate({fieldValue})".  You can simply define this loc string in
    strings.js if you prefer or you can override this method to provide a more specific error message.
  
    @param {SC.FormView} form the form this view belongs to
    @param {SC.View} field the field to validate.  Responds to fieldValue.
    @returns {SC.Error} an error object
  */
  validateError: function(form, field) { 
    return SC.$error(
      SC.String.loc("Invalid.General(%@)", field.get('fieldValue')),
      field.get('fieldKey')) ; 
  },

  // ..........................................
  // VALIDATION API
  //

  /**
    Invoked just before the user ends editing of the field.

    This is a primitive validation method.  You can implement the two higher-level
    methods (validate() and validateError()) if you prefer.
    
    The default implementation calls your validate() method and then validateError()
    if validate() returns NO.  This method should return SC.VALIDATE_OK if validation
    succeeded or an error object if it fails.
  
    @param {SC.FormView} form the form for the field
    @param {SC.View} field the field to validate
    @param {Object} oldValue: the value of the field before the change

    @returns SC.VALIDATE_OK or an error object.
  
  */
  validateChange: function(form, field, oldValue) { 
    return this.validate(form,field) ? SC.VALIDATE_OK : this.validateError(form, field);
  },

  /**
    Invoked just before the form is submitted.
  
    This method gives your validators one last chance to perform validation
    on the form as a whole.  The default version does the same thing as the 
    validateChange() method.
  
    @param {SC.FormView} form the form for the field
    @param {SC.View} field the field to validate

    @returns SC.VALIDATE_OK or an error object.
  
  */  
  validateSubmit: function(form, field) { 
    return this.validate(form,field) ? SC.VALIDATE_OK : this.validateError(form, field);
  },

  /**
    Invoked 1ms after the user types a key (if a change is allowed).  
  
    You can use this validate the new partial string and return an error if 
    needed. The default will validate a partial only if there was already an 
    error. This allows the user to try to get it right before you bug them.
  
    Unlike the other methods, you should return SC.VALIDATE_NO_CHANGE if you
    did not actually validate the partial string.  If you return 
    SC.VALIDATE_OK then any showing errors will be hidden.
  
    @param {SC.FormView} form the form for the field
    @param {SC.View} field the field to validate

    @returns SC.VALIDATE_OK, SC.VALIDATE_NO_CHANGE or an error object.
  */  
  validatePartial: function(form, field) { 
    if (!field.get('isValid')) {
      return this.validate(form,field) ? SC.VALIDATE_OK : this.validateError(form, field);
    } else return SC.VALIDATE_NO_CHANGE ;
  },
  
  /**
    Invoked when the user presses a key.  
  
    This method is used to restrict the letters and numbers the user is 
    allowed to enter.  You should not use this method to perform full 
    validation on the field.  Instead use validatePartial().
  
    @param {SC.FormView} form the form for the field
    @param {SC.View} field the field to validate
    @param {String} char the characters being added
    
    @returns {Boolean} YES if allowed, NO otherwise
  */
  validateKeyDown: function(form, field,charStr) { return true; },

  // .....................................
  // OTHER METHODS

  /**
    Called on all validators when they are attached to a field.  
  
    You can use this to do any setup that you need.  The default does nothing.
    
    @param {SC.FormView} form the form for the field
    @param {SC.View} field the field to validate
  */
  attachTo: function(form,field) { },

  /**
    Called on a validator just before it is removed from a field.  You can 
    tear down any setup you did for the attachTo() method.
    
    @param {SC.FormView} form the form for the field
    @param {SC.View} field the field to validate
  */
  detachFrom: function(form, field) {}

}) ;

SC.Validator.mixin(/** @scope SC.Validator */ {

  /**
    Return value when validation was performed and value is OK.
  */
  OK: true, 
  
  /**
    Return value when validation was not performed.
  */
  NO_CHANGE: false,  

  /**
    Invoked by a field whenever a validator is attached to the field.
    
    The passed validatorKey can be a validator instance, a validator class
    or a string naming a validator. To make your validator
    visible, you should name your validator under the SC.Validator base.
    for example SC.Validator.Number would get used for the 'number' 
    validator key.
  
    This understands validatorKey strings in the following format:

    * 'key' or 'multiple_words' will find validators Key and MultipleWords

    * if you want to share a single validator among multiple fields (for
      example to validate that two passwords are the same) set a name inside
      brackets. i.e. 'password[pwd]'.

    @param {SC.FormView} form the form for the field
    @param {SC.View} field the field to validate
    @param {Object} validatorKey the key to validate
    
    @returns {SC.Validator} validator instance or null
  */  
  findFor: function(form,field, validatorKey) {
    
    // Convert the validator into a validator instance.
    var validator ;
    if (!validatorKey) return ; // nothing to do...
    
    if (validatorKey instanceof SC.Validator) {
      validator = validatorKey ;
    } else if (validatorKey.isClass) {
      validator = validatorKey.create() ;
      
    } else if (SC.typeOf(validatorKey) === SC.T_STRING) {

      // extract optional key name
      var name = null ;
      var m = validatorKey.match(/^(.+)\[(.*)\]/) ;
      if (m) {
        validatorKey = m[1] ; name = m[2]; 
      }
      
      // convert the validatorKey name into a class.
      validatorKey = SC.String.classify(validatorKey);
      var validatorClass = SC.Validator[validatorKey] ;
      if (SC.none(validatorClass)) {
        throw new Error("validator %@ not found for %@".fmt(validatorKey, field));
      } else if (name) {

        // if a key was also passed, then find the validator in the list of
        // validators for the form.  Otherwise, just create a new instance.
        if (!form) {
          throw new Error("named validator (%@) could not be found for field %@ because the field does not belong to a form".fmt(name,field));
        }
        
        if (!form._validatorHash) form._validatorHash = {} ;
        validator = (name) ? form._validatorHash[name] : null ;
        if (!validator) validator = validatorClass.create() ;
        if (name) form._validatorHash[name] = validator ;
      } else validator = validatorClass.create() ;
    } 
    
    return validator ;
  },
  
  /**
    Convenience class method to call the fieldValueForObject() instance
    method you define in your subclass.
  */
  fieldValueForObject: function(object, form, field) {
    if (this.prototype && this.prototype.fieldValueForObject) {
      return this.prototype.fieldValueForObject(object,form,field) ;
    }
    else return null ;
  },
  
  /**
    Convenience class method to call the objectForFieldValue() instance
    method you define in your subclass.
  */
  objectForFieldValue: function(value, form, field) {
    if (this.prototype && this.prototype.objectForFieldValue) {
      return this.prototype.objectForFieldValue(value,form,field) ;
    }
    else return null ;
  }
  
});

/* >>>>>>>>>> BEGIN source/validators/credit_card.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('validators/validator') ;

/** @class
  Validate a field value as a credit card number. 
  
  This validator will perform a basic check to ensure the credit card number
  is mathematically valid.  It will also accept numbers with spaces, dashes
  or other punctuation.  
  
  Converted credit card numbers are broken into units of 4.
  
  Basic credit card validation courtesy David Leppek 
  (https://www.azcode.com/Mod10)

  @extends SC.Validator
  @since SproutCore 1.0
*/
SC.Validator.CreditCard = SC.Validator.extend(
/** @scope SC.Validator.CreditCard.prototype */ {

  /**
    Expects a string of 16 digits.  Will split into groups of 4 for display.
  */
  fieldValueForObject: function(object, form, field) {
    if (typeof(object) == "string" && object.length == 16) {
      object = [object.slice(0,4),object.slice(4,8),object.slice(8,12),object.slice(12,16)].join(' ') ;
    }
    return object ;
  },

  /**
    Removes all whitespace or dashes to make a single string.
  */
  objectForFieldValue: function(value, form, field) {
    return value.replace(/[\s-\.\:]/g,'') ;
  },
  
  validate: function(form, field) { 
    return this.checkNumber(field.get('fieldValue')) ; 
  },
  
  validateError: function(form, field) {
    var label = field.get('errorLabel') || 'Field' ;
    return SC.$error(SC.String.loc("Invalid.CreditCard(%@)", label), label);
  },
  
  /** 
    Allow only numbers, dashes, and spaces 
  */
  validateKeyDown: function(form, field, charStr) {
    return !!charStr.match(/[0-9\- ]/);
  },
  
  checkNumber: function(ccNumb) {
    
    if (!ccNumb || ccNumb.length===0) return YES; // do not validate empty
    
    // remove any spaces or dashes
    ccNumb = ccNumb.replace(/[^0-9]/g,'');
    
    var valid = "0123456789";  // Valid digits in a credit card number
    var len = ccNumb.length;  // The length of the submitted cc number
    var iCCN = parseInt(ccNumb,0);  // integer of ccNumb
    var sCCN = ccNumb.toString();  // string of ccNumb
    sCCN = sCCN.replace (/^\s+|\s+$/g,'');  // strip spaces
    var iTotal = 0;  // integer total set at zero
    var bNum = true;  // by default assume it is a number
    var bResult = false;  // by default assume it is NOT a valid cc
    var temp;  // temp variable for parsing string
    var calc;  // used for calculation of each digit

    // Determine if the ccNumb is in fact all numbers
    for (var j=0; j<len; j++) {
      temp = "" + sCCN.substring(j, j+1);
      if (valid.indexOf(temp) == "-1"){bNum = false;}
    }

    // if it is NOT a number, you can either alert to the fact, 
    // or just pass a failure
    if(!bNum) bResult = false;

    // Determine if it is the proper length 
    if((len === 0)&&(bResult)){  // nothing, field is blank AND passed above # check
      bResult = false;
    } else{  // ccNumb is a number and the proper length - let's see if it is a valid card number
      if(len >= 15){  // 15 or 16 for Amex or V/MC
        for(var i=len;i>0;i--){  // LOOP through the digits of the card
          calc = parseInt(iCCN,0) % 10;  // right most digit
          calc = parseInt(calc,0);  // assure it is an integer
          iTotal += calc;  // running total of the card number as we loop - Do Nothing to first digit
          i--;  // decrement the count - move to the next digit in the card
          iCCN = iCCN / 10;                               // subtracts right most digit from ccNumb
          calc = parseInt(iCCN,0) % 10 ;    // NEXT right most digit
          calc = calc *2;                                 // multiply the digit by two
          // Instead of some screwy method of converting 16 to a string and then parsing 1 and 6 and then adding them to make 7,
          // I use a simple switch statement to change the value of calc2 to 7 if 16 is the multiple.
          switch(calc){
            case 10: calc = 1; break;       //5*2=10 & 1+0 = 1
            case 12: calc = 3; break;       //6*2=12 & 1+2 = 3
            case 14: calc = 5; break;       //7*2=14 & 1+4 = 5
            case 16: calc = 7; break;       //8*2=16 & 1+6 = 7
            case 18: calc = 9; break;       //9*2=18 & 1+8 = 9
            default: calc = calc;           //4*2= 8 &   8 = 8  -same for all lower numbers
          }                                               
        iCCN = iCCN / 10;  // subtracts right most digit from ccNum
        iTotal += calc;  // running total of the card number as we loop
      }  // END OF LOOP
      if ((iTotal%10)===0){  // check to see if the sum Mod 10 is zero
        bResult = true;  // This IS (or could be) a valid credit card number.
      } else {
        bResult = false;  // This could NOT be a valid credit card number
        }
      }
    }
    return bResult; // Return the results
  }
    
}) ;

/* >>>>>>>>>> BEGIN source/validators/date.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('validators/validator') ;

/**
  Handle parsing and display of dates.
  
  @class
  @extends SC.Validator
  @author Charles Jolley
  @version 1.0
*/
SC.Validator.Date = SC.Validator.extend(
/** @scope SC.Validator.Date.prototype */ {

  /**
    The standard format you want the validator to convert dates to.
  */
  format: '%b %d, %Y %i:%M:%S %p',
  
  /**
    if we have a number, then convert to a date object.
  */
  fieldValueForObject: function(object, form, field) {
    var format = this.get('format'),
        dateTime;

    /*
      TODO [CC] deprecated warning, we should remove this in a future release
    */
    
    if (format.indexOf('%') === -1) {
      SC.Logger.warn("You're using a Date validator with a format (%@) for time.js, which has been deprecated. Please change your format to something compatible with SC.DateTime".fmt(format));
      format = this.constructor.prototype.format;
    }
    

    if (SC.typeOf(object) === SC.T_NUMBER) {
      dateTime = SC.DateTime.create(object);
    } else if (object instanceof Date) {
      dateTime = object.getTime();
    }

    if (dateTime) { object = dateTime.toFormattedString(format); }

    return object;
  },

  /**
    Try to pass value as a date. convert into a number, or return null if
    it could not be parsed.
  */
  objectForFieldValue: function(value, form, field) {
    var format = this.get('format'),
        dateTime;

    /*
      TODO [CC] deprecated warning, we should remove this in a future release
    */
    
    if (format.indexOf('%') === -1) {
      SC.Logger.warn("You're using a Date validator with a format (%@) for time.js, which has been deprecated. Please change your format to something compatible with SC.DateTime".fmt(format));
      format = this.constructor.prototype.format;
    }
    

    if (value) {
      dateTime = SC.DateTime.parse(value, format);
      value = dateTime ? dateTime._ms : null;
    }
    return value ;
  }
    
}) ;

/* >>>>>>>>>> BEGIN source/validators/date_time.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('validators/validator');

/**
  This validates a SC.DateTime, used in SC.DateFieldView.
  
  @class
  @extends SC.Validator
  @author Juan Pablo Goldfinger
  @version 1.0
*/
SC.Validator.DateTime = SC.Validator.extend({

  /**
    The standard format you want the validator to convert dates to.
  */
  format: '%d/%m/%Y',

  /**
    if we have a number, then convert to a date object.
  */
  fieldValueForObject: function(object, form, field) {
    if (SC.kindOf(object, SC.DateTime)) {
      object = object.toFormattedString(this.get('format'));
    } else {
      object = null;
    }
    return object;
  },

  /**
    Try to pass value as a date. convert into a number, or return null if
    it could not be parsed.
  */
  objectForFieldValue: function(value, form, field) {
    if (value) {
      value = SC.DateTime.parse(value, this.get('format'));
    }
    return value;
  }

});

/* >>>>>>>>>> BEGIN source/validators/email.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('validators/validator') ;

/**
  Requires a valid email format.
  
  @class
  @extends SC.Validator
  @version 1.0
*/
SC.Validator.Email = SC.Validator.extend(
/** @scope SC.Validator.Email.prototype */ {
  
  validate: function(form, field) { 
    return (field.get('fieldValue') || '').match(/.+@.+\...+/) ; 
  },
  
  validateError: function(form, field) {
    var label = field.get('errorLabel') || 'Field' ;
    return SC.$error(SC.String.loc("Invalid.Email(%@)", label), label) ;
  }  
    
}) ;

/**
  This variant allows an empty field as well as an email address.
  
  @class
  @extends SC.Validator.Email
  @author Charles Jolley
  @version 1.0
*/
SC.Validator.EmailOrEmpty = SC.Validator.Email.extend(
/** @scope SC.Validator.EmailOrEmpty.prototype */ {
  validate: function(form, field) {
    var value = field.get('fieldValue') ; 
    return (value && value.length > 0) ? value.match(/.+@.+\...+/) : true ;
  }
}) ;

/* >>>>>>>>>> BEGIN source/validators/not_empty.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('validators/validator') ;

/**
  Requires some content in field, but does not check the specific content.
  
  @class
  @extends SC.Validator
  @author Charles Jolley
  @version 1.0
*/
SC.Validator.NotEmpty = SC.Validator.extend(
/** @scope SC.Validator.NotEmpty.prototype */ {
  
  validate: function(form, field) {
    var value = field.get('fieldValue');
    if (SC.none(value)) { return NO; }
    if (! SC.none(value.length)) { return value.length > 0; }
    return YES;
  },
  
  validateError: function(form, field) {
    var label = field.get('errorLabel') || 'Field' ;
    return SC.$error(SC.String.loc("Invalid.NotEmpty(%@)", SC.String.capitalize(label)), field.get('errorLabel'));
  }

}) ;

/* >>>>>>>>>> BEGIN source/validators/number.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('validators/validator') ;
sc_require('system/utils/misc');

/**
  Handles parsing and validating of numbers.
  
  @extends SC.Validator
  @author Charles Jolley
  @version 1.0
  @class
*/
SC.Validator.Number = SC.Validator.extend(
/** @scope SC.Validator.Number.prototype */ {

  /**
    Number of decimal places to show.  
    
    If 0, then numbers will be treated as integers.  Otherwise, numbers will
    show with a fixed number of decimals.
  */
  places: 0,
  
  fieldValueForObject: function(object, form, field) {
    switch(SC.typeOf(object)) {
      case SC.T_NUMBER:
        object = object.toFixed(this.get('places')) ;
        break ;
      case SC.T_NULL:
      case SC.T_UNDEFINED:
        object = '';
        break ;
    }
    return object ;
  },

  objectForFieldValue: function(value, form, field) {
    // strip out commas
    var result;
    value = value.replace(/,/g,'');
    switch(SC.typeOf(value)) {
      case SC.T_STRING:
        if (value.length === 0) {
          value = null ;
        } else if (this.get('places') > 0) {
          value = parseFloat(value) ;
        } else {
          if(value.length===1 && value.match(/-/)) value = null;
          else {
            result = parseInt(value,0) ;
            if(isNaN(result)){
              value = SC.uniJapaneseConvert(value);
              value = parseInt(value,0) ;
              if(isNaN(value)) value='';
            }else value = result;
          }
        }
        break ;
      case SC.T_NULL:
      case SC.T_UNDEFINED:
        value = null ;
        break ;
    }
    return value ;
  },
  
  validate: function(form, field) { 
    var value = field.get('fieldValue') ;
    return (value === '') || !(isNaN(value) || isNaN(parseFloat(value))) ; 
  },
  
  validateError: function(form, field) {
    var label = field.get('errorLabel') || 'Field' ;
    return SC.$error(SC.String.loc("Invalid.Number(%@)", label), label) ;
  },
  
  /** 
    Allow only numbers, dashes, period, and commas
  */
  validateKeyDown: function(form, field, charStr) {
    if(!charStr) charStr = "";
    var text = field.$input().val();
    if (!text) text='';
    text+=charStr;

    if(this.get('places')===0){
      if(charStr.length===0) return true;
      else return text.match(/^[\-{0,1}]?[0-9,\0]*/)[0]===text;
    }else {
      if(charStr.length===0) return true;
      else return text.match(/^[\-{0,1}]?[0-9,\0]*\.?[0-9\0]+/)===text;
    }
  }
    
}) ;

/* >>>>>>>>>> BEGIN source/validators/password.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('validators/validator') ;

/**
  Ensures all fields with the Password validator attached in the same form
  contain the same value.
  
  @class
  @extends SC.Validator
  @author Charles Jolley
  @version 1.0
*/
SC.Validator.Password = SC.Validator.extend(
/** @scope SC.Validator.Password.prototype */ {

  attachTo: function(form,field) {
    arguments.callee.base.apply(this,arguments);
    if (!this.fields) this.fields = [] ;
    this.fields.push(field) ;
  },

  validate: function(force) {
    if (!this.fields || this.fields.length === 0) return true ;
    
    var empty = false ;
    var notEmpty = false ;
    var ret = true ;
    var value = this.fields[0].get('fieldValue') ;
    this.fields.forEach(function(field) {
      var curValue = field.get('fieldValue') ;
      if (curValue != value) ret= false ;
      if (!curValue || curValue.length === 0) empty = true ;
      if (curValue && curValue.length > 0) notEmpty = true ;
    }) ;

    // if forces, valid OK if there was an empty.  If not forced, valid OK 
    // only if all fields match AND they are not all empty.
    if (force) {
      return (notEmpty === false) ? false : ret ;
    } else {
      return (empty === true) ? true : ret ;
    }
  },
  
  // update field states
  updateFields: function(form,valid) {
    if (!this.fields || this.fields.length === 0) return true ;
    var err = SC.String.loc("Invalid.Password");
    var topField = this._field ;
    this.fields.forEach(function(f) {
      var msg = (valid) ? null : ((f == topField) ? err : '') ;
      form.setErrorFor(f,msg) ;
    }) ;
    return (valid) ? SC.VALIDATE_OK : err ;
  },
  
  validateChange: function(form, field, oldValue) { 
    return this.updateFields(form, this.validate(false)) ;
  },

  // this method is called just before the form is submitted.
  // field: the field to validate.
  validateSubmit: function(form, field) { 
    return this.updateFields(form, this.validate(true)) ;
  },

  // this method gets called 1ms after the user types a key (if a change is
  // allowed).  You can use this validate the new partial string and return 
  // an error if needed.
  //
  // The default will validate a partial only if there was already an error.
  // this allows the user to try to get it right before you bug them.
  validatePartial: function(form, field) {
    var isInvalid = !this._field.get('isValid') ;
    if (isInvalid) {
      return this.updateFields(form, this.validate(false)) ;
    } else return SC.VALIDATE_NO_CHANGE ;
  }
    
}) ;

/* >>>>>>>>>> BEGIN source/validators/positive_integer.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('validators/validator') ;

/**
  Handles parsing and validating of positive integers.
  
  @extends SC.Validator
  @author Nirumal Thomas
  @version 1.0
  @class
*/
SC.Validator.PositiveInteger = SC.Validator.extend(
/** @scope SC.Validator.PositiveInteger.prototype */ {

  /**
    Default Value to be displayed. If the value in the text field is null,
    undefined or an empty string, it will be replaced by this value.

    @property
    @type Number
    @default null
  */
  defaultValue: null,

  fieldValueForObject: function(object, form, field) {
    switch(SC.typeOf(object)) {
      case SC.T_NUMBER:
        object = object.toFixed(0) ;
        break ;
      case SC.T_NULL:
      case SC.T_UNDEFINED:
        object = this.get('defaultValue') ;
        break ;
    }
    return object ;
  },

  objectForFieldValue: function(value, form, field) {
    // strip out commas
    value = value.replace(/,/g,'');
    switch(SC.typeOf(value)) {
      case SC.T_STRING:
        if (value.length === 0) {
          value = this.get('defaultValue') ;
        } else {
          value = parseInt(value, 0) ;
        }
        break ;
      case SC.T_NULL:
      case SC.T_UNDEFINED:
        value = this.get('defaultValue') ;
        break ;
    }
    if(isNaN(value)) return this.get('defaultValue');
    return value ;
  },

  validate: function(form, field) {
    var value = field.get('fieldValue') ;
    return (value === '') || !isNaN(value) ;
  },
  
  validateError: function(form, field) {
    var label = field.get('errorLabel') || 'Field' ;
    return SC.$error(SC.String.loc("Invalid.Number(%@)", label), label) ;
  },
  
  /** 
    Allow only numbers
  */
  validateKeyDown: function(form, field, charStr) {
    var text = field.$input().val();
    if (!text) text='';
    text+=charStr;
    if(charStr.length===0) return true ;
    else return text.match(/^[0-9\0]*/)[0]===text;
  }
    
}) ;

/* >>>>>>>>>> BEGIN source/views/field.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('mixins/validatable') ;

/** @class

  Base view for managing a view backed by an input element.  Since the web
  browser provides native support for editing input elements, this view
  provides basic support for listening to changes on these input elements and
  responding to them.

  Generally you will not work with a FieldView directly.  Instead, you should
  use one of the subclasses implemented by your target platform such as
  SC.CheckboxView, SC.RadioView, SC.TextFieldView, and so on.

  @extends SC.View
  @extends SC.Control
  @extends SC.Validatable
  @since SproutCore 1.0
*/
SC.FieldView = SC.View.extend(SC.Control, SC.Validatable,
/** @scope SC.FieldView.prototype */ {

  /**
  _field_isMouseDown: NO,

  /**
    The raw value of the field itself.  This is computed from the 'value'
    property by passing it through any validator you might have set.  This is
    the value that will be set on the field itself when the view is updated.

    @type String
  */
  fieldValue: function() {
    var value = this.get('value');
    if (SC.typeOf(value) === SC.T_ERROR) value = value.get('errorValue');
    return this.fieldValueForObject(value);
  }.property('value', 'validator').cacheable(),

  // ..........................................................
  // PRIMITIVES
  //

  /**
    Override to return an CoreQuery object that selects the input elements
    for the view.  If this method is defined, the field view will
    automatically edit the attrbutes of the input element to reflect the
    current isEnabled state among other things.
  */
  $input: function() {
    var elementTagName = this._inputElementTagName(); // usually "input"
    return this.$(elementTagName).andSelf().filter(elementTagName);
  },

  /** @private
    Override to specify the HTML element type to use as the field. For
    example, "input" or "textarea".
  */
  _inputElementTagName: function() {
    return 'input';
  },

  /**
    Override to set the actual value of the field.

    The default implementation will simple copy the newValue to the value
    attribute of any input tags in the receiver view.  You can override this
    method to provide specific functionality needed by your view.

    @param {Object} newValue the value to display.
    @returns {SC.FieldView} receiver
  */
  setFieldValue: function(newValue) {
    if (SC.none(newValue)) newValue = '' ;
    var input = this.$input();

    // Don't needlessly set the element if it already has the value, because
    // doing so moves the cursor to the end in some browsers.
    if (input.val() !== newValue) {
      input.val(newValue);
    }
    return this ;
  },

  /**
    Override to retrieve the actual value of the field.

    The default implementation will simply retrieve the value attribute from
    the first input tag in the receiver view.

    @returns {String} value
  */
  getFieldValue: function() {
    return this.$input().val();
  },

  _field_fieldValueDidChange: function(evt) {
    SC.run(function() {
      this.fieldValueDidChange(NO);
    }, this);
  },

  /**
    Your class should call this method anytime you think the value of the
    input element may have changed.  This will retrieve the value and update
    the value property of the view accordingly.

    If this is a partial change (i.e. the user is still editing the field and
    you expect the value to change further), then be sure to pass YES for the
    partialChange parameter.  This will change the kind of validation done on
    the value.  Otherwise, the validator may mark the field as having an error
    when the user is still in mid-edit.

    @param partialChange (optional) YES if this is a partial change.
    @returns {Boolean|SC.Error} result of validation.
  */
  fieldValueDidChange: function(partialChange) {
    // collect the field value and convert it back to a value
    var fieldValue = this.getFieldValue();
    var value = this.objectForFieldValue(fieldValue, partialChange);
    this.setIfChanged('value', value);


    // ======= [Old code -- left here for concept reminders. Basic validation
    // API works without it] =======

    // validate value if needed...

    // this.notifyPropertyChange('fieldValue');
    //
    // // get the field value and set it.
    // // if ret is an error, use that instead of the field value.
    // var ret = this.performValidate ? this.performValidate(partialChange) : YES;
    // if (ret === SC.VALIDATE_NO_CHANGE) return ret ;
    //
    // this.propertyWillChange('fieldValue');
    //
    // // if the validator says everything is OK, then in addition to posting
    // // out the value, go ahead and pass the value back through itself.
    // // This way if you have a formatter applied, it will reformat.
    // //
    // // Do this BEFORE we set the value so that the valueObserver will not
    // // overreact.
    // //
    // var ok = SC.$ok(ret);
    // var value = ok ? this._field_getFieldValue() : ret ;
    // if (!partialChange && ok) this._field_setFieldValue(value) ;
    // this.set('value',value) ;
    //
    // this.propertyDidChange('fieldValue');
    //
    // return ret ;
  },

  // ..........................................................
  // INTERNAL SUPPORT
  //

  /** @private
    invoked when the value property changes.  Sets the field value...
  */
  _field_valueDidChange: function() {
    this.setFieldValue(this.get('fieldValue'));
  }.observes('fieldValue'),

  /**
    SC.View view state callback.

    After the layer is created, set the field value and begin observing
    change events on the input field.
  */
  didCreateLayer: function() {
    this.setFieldValue(this.get('fieldValue'));
    this._addChangeEvent();
  },

  /**
    SC.View state callback.

    Removes the change event from the input field.
  */
  willDestroyLayer: function() {
    SC.Event.remove(this.$input(), 'change', this, this._field_fieldValueDidChange);
  },

  // ACTIONS
  // You generally do not need to override these but they may be used.

  /**
    Called to perform validation on the field just before the form
    is submitted.  If you have a validator attached, this will get the
    validators.
  */
  // validateSubmit: function() {
  //   var ret = this.performValidateSubmit ? this.performValidateSubmit() : YES;
  //   // save the value if needed
  //   var value = SC.$ok(ret) ? this._field_getFieldValue() : ret ;
  //   if (value != this.get('value')) this.set('value', value) ;
  //   return ret ;
  // },

  // OVERRIDE IN YOUR SUBCLASS
  // Override these primitives in your subclass as required.

  /**
    SC.RootResponder event handler.

    Allow the browser to do its normal event handling for the mouse down
    event.  But first, set isActive to YES.
  */
  mouseDown: function(evt) {
    this._field_isMouseDown = YES;
    evt.allowDefault();
    return YES;
  },

  /**
    SC.RootResponder event handler.

    Remove the active class on mouseExited if mouse is down.
  */
  mouseExited: function(evt) {
    if (this._field_isMouseDown) this.set('isActive', NO);
    evt.allowDefault();
    return YES;
  },

  /**
    SC.RootResponder event handler.

    If mouse was down and we renter the button area, set the active state again.
  */
  mouseEntered: function(evt) {
    this.set('isActive', this._field_isMouseDown);
    evt.allowDefault();
    return YES;
  },

  /**
    SC.RootResponder event handler.

    On mouse up, remove the isActive class and then allow the browser to do
    its normal thing.
  */
  mouseUp: function(evt) {
    // track independently in case isEnabled has changed
    if (this._field_isMouseDown) this.set('isActive', NO);
    this._field_isMouseDown = NO;
    evt.allowDefault();
    return YES ;
  },

  /**
    SC.RootResponder event handler.

    Simply allow keyDown & keyUp to pass through to the default web browser
    implementation.
  */
  keyDown: function(evt) {

    // handle tab key
    if (evt.which === 9 || evt.keyCode===9) {
      var view = evt.shiftKey ? this.get('previousValidKeyView') : this.get('nextValidKeyView');
      if (view) view.becomeFirstResponder();
      else evt.allowDefault();
      return YES ; // handled
    }

    // validate keyDown...
    if (this.performValidateKeyDown(evt)) {
      this._isKeyDown = YES ;
      evt.allowDefault();
    } else {
      evt.stop();
    }

    return YES;
  },

  /**
    Override of SC.Responder.prototype.acceptsFirstResponder.

    Tied to the `isEnabledInPane` state.
  */
  acceptsFirstResponder: function() {
    if (SC.FOCUS_ALL_CONTROLS) { return this.get('isEnabledInPane'); }
    return NO;
  }.property('isEnabledInPane'),

  /** @private */
  _addChangeEvent: function() {
    SC.Event.add(this.$input(), 'change', this, this._field_fieldValueDidChange);
  },

  /** @private */
  // these methods use the validator to convert the raw field value returned
  // by your subclass into an object and visa versa.
  _field_setFieldValue: function(newValue) {
    this.propertyWillChange('fieldValue');
    if (this.fieldValueForObject) {
      newValue = this.fieldValueForObject(newValue) ;
    }
    var ret = this.setFieldValue(newValue) ;
    this.propertyDidChange('fieldValue');
    return ret ;
  },

  /** @private */
  _field_getFieldValue: function() {
    var ret = this.getFieldValue() ;
    if (this.objectForFieldValue) ret = this.objectForFieldValue(ret);
    return ret ;
  }
});


/* >>>>>>>>>> BEGIN source/views/image.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
//            Portions ©2010 Strobe Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

SC.IMAGE_STATE_NONE = 'none';
SC.IMAGE_STATE_LOADING = 'loading';
SC.IMAGE_STATE_LOADED = 'loaded';
SC.IMAGE_STATE_FAILED = 'failed';

SC.IMAGE_TYPE_NONE = 'NONE';
SC.IMAGE_TYPE_URL = 'URL';
SC.IMAGE_TYPE_CSS_CLASS = 'CSS_CLASS';

/**
  URL to a transparent GIF.  Used for spriting.
*/
SC.BLANK_IMAGE_DATAURL = "data:image/gif;base64,R0lGODlhAQABAJAAAP///wAAACH5BAUQAAAALAAAAAABAAEAAAICBAEAOw==";

SC.BLANK_IMAGE_URL = SC.browser.isIE && SC.browser.compare(SC.browser.version, '8') <= 0 ? '/static/sproutcore/foundation/en/current/source/resources/blank.gif?1409345755' : SC.BLANK_IMAGE_DATAURL;

SC.BLANK_IMAGE = new Image();
SC.BLANK_IMAGE.src = SC.BLANK_IMAGE_URL;
SC.BLANK_IMAGE.width = SC.BLANK_IMAGE.height = 1;

/**
  @class

  Displays an image in the browser.

  The ImageView can be used to efficiently display images in the browser.
  It includes a built in support for a number of features that can improve
  your page load time if you use a lot of images including a image loading
  cache and automatic support for CSS spriting.

  Note that there are actually many controls that will natively include
  images using an icon property name.

  @extends SC.View
  @extends SC.Control
  @extends SC.InnerFrame
  @since SproutCore 1.0
*/
SC.ImageView = SC.View.extend(SC.Control, SC.InnerFrame,
/** @scope SC.ImageView.prototype */ {

  classNames: 'sc-image-view',

  // Don't apply this role until each image view can assign a non-empty string value for @aria-label <rdar://problem/9941887>
  // ariaRole: 'img',

  displayProperties: ['align', 'scale', 'value', 'displayToolTip'],

  renderDelegateName: function () {
    return (this.get('useCanvas') ? 'canvasImage' : 'image') + "RenderDelegate";
  }.property('useCanvas').cacheable(),

  tagName: function () {
    return this.get('useCanvas') ? 'canvas' : 'div';
  }.property('useCanvas').cacheable(),


  // ..........................................................
  // Properties
  //

  /**
    If YES, this image can load in the background.  Otherwise, it is treated
    as a foreground image.  If the image is not visible on screen, it will
    always be treated as a background image.
  */
  canLoadInBackground: NO,

  /** @private
    @type Image
    @default SC.BLANK_IMAGE
  */
  image: SC.BLANK_IMAGE,


  /** @private
    The frame for the inner img element or for the canvas to draw within, altered according to the scale
    and align properties provided by SC.InnerFrame.

    @type Object
  */
  innerFrame: function () {
    var image = this.get('image'),
      imageWidth = image.width,
      imageHeight = image.height,
      frame = this.get('frame');

    if (SC.none(frame)) return { x: 0, y: 0, width: 0, height: 0 };  // frame is 'null' until rendered when useStaticLayout === YES

    return this.innerFrameForSize(imageWidth, imageHeight, frame.width, frame.height);
  }.property('align', 'image', 'scale', 'frame').cacheable(),

  /**
    If YES, any specified toolTip will be localized before display.

    @type Boolean
    @default YES
  */
  localize: YES,

  /**
    Current load status of the image.

    This status changes as an image is loaded from the server.  If spriting
    is used, this will always be loaded.  Must be one of the following
    constants: SC.IMAGE_STATE_NONE, SC.IMAGE_STATE_LOADING,
    SC.IMAGE_STATE_LOADED, SC.IMAGE_STATE_FAILED

    @type String
  */
  status: SC.IMAGE_STATE_NONE,

  /**
    Will be one of the following constants: SC.IMAGE_TYPE_URL or
    SC.IMAGE_TYPE_CSS_CLASS

    @type String
    @observes value
  */
  type: function () {
    var value = this.get('value');

    if (SC.ImageView.valueIsUrl(value)) return SC.IMAGE_TYPE_URL;
    else if (!SC.none(value)) return SC.IMAGE_TYPE_CSS_CLASS;
    return SC.IMAGE_TYPE_NONE;
  }.property('value').cacheable(),

  /**
    The canvas element performs better than the img element since we can
    update the canvas image without causing browser reflow.  As an additional
    benefit, canvas images are less easily copied, which is generally in line
    with acting as an 'application'.

    @type Boolean
    @default YES if supported
    @since SproutCore 1.5
  */
  useCanvas: function () {
    return SC.platform.supportsCanvas && !this.get('useStaticLayout');
  }.property('useStaticLayout', 'type').cacheable(),

  /**
    If YES, image view will use the SC.imageQueue to control loading.  This
    setting is generally preferred.

    @type Boolean
    @default YES
  */
  useImageQueue: YES,

  /**
    A url or CSS class name.

    This is the image you want the view to display.  It should be either a
    url or css class name.  You can also set the content and
    contentValueKey properties to have this value extracted
    automatically.

    If you want to use CSS spriting, set this value to a CSS class name.  If
    you need to use multiple class names to set your icon, separate them by
    spaces.

    Note that if you provide a URL, it must contain at least one '/' as this
    is how we autodetect URLs.

    @type String
  */
  value: null,

  /**
    Recalculate our innerFrame if the outer frame has changed.

    @returns {void}
  */
  viewDidResize: function () {
    arguments.callee.base.apply(this,arguments);

    // Note: SC.View's updateLayer() will call viewDidResize() if useStaticLayout is true.  The result of this
    // is that since our display depends on the frame, when the view or parent view resizes, viewDidResize
    // notifies that the frame has changed, so we update our view, which calls viewDidResize, which notifies
    // that the frame has changed, so we update our view, etc. in an infinite loop.
    if (this.get('useStaticLayout')) {
      if (this._updatingOnce) {
        this._updatingOnce = false;
      } else {
        // Allow a single update when the view resizes to avoid an infinite loop.
        this._updatingOnce = true;
        this.updateLayerIfNeeded();
      }
    } else {
      this.updateLayerIfNeeded();
    }
  },

  // ..........................................................
  // Methods
  //

  /** @private */
  init: function () {
    arguments.callee.base.apply(this,arguments);

    // Start loading the image immediately on creation.
    this._valueDidChange();

    if (this.get('useImageCache') !== undefined) {
      
      SC.warn("Developer Warning: %@ has useImageCache set, please set useImageQueue instead".fmt(this));
      
      this.set('useImageQueue', this.get('useImageCache'));
    }
  },


  // ..........................................................
  // Rendering
  //

  /**
    Called when the element is attached to the document.

    If the image uses static layout (i.e. we don't know the frame beforehand),
    then this method will call updateLayerIfNeeded in order to adjust the inner
    frame of the image according to its rendered frame.
  */
  didAppendToDocument: function () {
    // If using static layout, we can still support image scaling and aligning,
    // but we need to do it post-render.
    if (this.get('useStaticLayout')) {
      // Call updateLayer manually, because we can't have innerFrame be a
      // display property.  It causes an infinite loop with static layout.
      this.updateLayerIfNeeded();
    }
  },

  /**
    Called when the element is created.

    If the view is using a canvas element, then we can not draw to the canvas
    until it exists.  This method will call updateLayerIfNeeded in order to draw
    to the canvas.
  */
  didCreateLayer: function () {
    if (this.get('useCanvas')) {
      this.updateLayerIfNeeded();
    }
  },

  // ..........................................................
  // Value handling
  //

  /** @private
    Whenever the value changes, update the image state and possibly schedule
    an image to load.
  */
  _valueDidChange: function () {
    var value = this.get('value'),
      type = this.get('type');

    // Reset the backing image object every time.
    this.set('image', SC.BLANK_IMAGE);

    if (type == SC.IMAGE_TYPE_URL) {
      // Load the image.
      this.set('status', SC.IMAGE_STATE_LOADING);

      // order: image cache, normal load
      if (!this._loadImageUsingCache()) {
        this._loadImage();
      }
    }
  }.observes('value'),

  /** @private
    Tries to load the image value using the SC.imageQueue object. If the value is not
    a URL, it won't attempt to load it using this method.

    @returns YES if loading using SC.imageQueue, NO otherwise
  */
  _loadImageUsingCache: function () {
    var value = this.get('value'),
        type = this.get('type');

    // now update local state as needed....
    if (type === SC.IMAGE_TYPE_URL && this.get('useImageQueue')) {
      var isBackground = this.get('isVisibleInWindow') || this.get('canLoadInBackground');

      SC.imageQueue.loadImage(value, this, this._loadImageUsingCacheDidComplete, isBackground);
      return YES;
    }

    return NO;
  },

  /** @private */
  _loadImageUsingCacheDidComplete: function (url, image) {
    var value = this.get('value');

    if (value === url) {
      if (SC.ok(image)) {
        this.didLoad(image);
      } else {
        // if loading it using the cache didn't work, it's useless to try loading the image normally
        this.didError(image);
      }
    }
  },

  /** @private
    Loads an image using a normal Image object, without using the SC.imageQueue.

    @returns YES if it will load, NO otherwise
  */
  _loadImage: function () {
    var value = this.get('value'),
        type = this.get('type'),
        that = this,
        image,
        jqImage;

    if (type === SC.IMAGE_TYPE_URL) {
      image = new Image();

      var errorFunc = function () {
        SC.run(function () {
          that._loadImageDidComplete(value, SC.$error("SC.Image.FailedError", "Image", -101));
        });
      };

      var loadFunc = function () {
        SC.run(function () {
          that._loadImageDidComplete(value, image);
        });
      };

      // Don't grab the jQuery object repeatedly
      jqImage = $(image);

      // Using bind here instead of setting onabort/onerror/onload directly
      // fixes an issue with images having 0 width and height
      jqImage.bind('error', errorFunc);
      jqImage.bind('abort', errorFunc);
      jqImage.bind('load', loadFunc);

      image.src = value;
      return YES;
    }

    return NO;
  },

  /** @private */
  _loadImageDidComplete: function (url, image) {
    var value = this.get('value');

    if (value === url) {
      if (SC.ok(image)) {
        this.didLoad(image);
      } else {
        this.didError(image);
      }
    }
  },

  didLoad: function (image) {
    this.set('status', SC.IMAGE_STATE_LOADED);
    if (!image) image = SC.BLANK_IMAGE;
    this.set('image', image);
    this.displayDidChange();
  },

  didError: function (error) {
    this.set('status', SC.IMAGE_STATE_FAILED);
    this.set('image', SC.BLANK_IMAGE);
  }

});

/**
  Returns YES if the passed value looks like an URL and not a CSS class
  name.
*/
SC.ImageView.valueIsUrl = function (value) {
  return value && SC.typeOf(value) === SC.T_STRING ? value.indexOf('/') >= 0 : NO;
};

/* >>>>>>>>>> BEGIN source/views/text_field.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('views/field');
sc_require('system/text_selection');
sc_require('mixins/static_layout');
sc_require('mixins/editable');

SC.AUTOCAPITALIZE_NONE = 'none';
SC.AUTOCAPITALIZE_SENTENCES = 'sentences';
SC.AUTOCAPITALIZE_WORDS = 'words';
SC.AUTOCAPITALIZE_CHARACTERS = 'characters';

/**
  @class

  A text field is an input element with type "text".  This view adds support
  for hinted values, etc.

  @extends SC.FieldView
  @extends SC.Editable
  @author Charles Jolley
 */
SC.TextFieldView = SC.FieldView.extend(SC.Editable,
  /** @scope SC.TextFieldView.prototype */ {

  classNames: ['sc-text-field-view'],

  /**
    Walk like a duck.

    @type Boolean
    @default YES
    @readOnly
   */
  isTextField: YES,

  // ..........................................................
  // PROPERTIES
  //

  /**
    When `applyImmediately` is turned on, every keystroke will set the value
    of the underlying object. Turning it off will only set the value on blur.

    @type String
    @default YES
   */
  applyImmediately: YES,

  /**
    Flag indicating whether the editor should automatically commit if you click
    outside it.

    @type Boolean
    @default YES
   */
  commitOnBlur: YES,

  /** @deprecated
    If `YES`, the field will hide its text from display.
    This value is deprecated. Please use `type` instead to `"password"`.

    @type Boolean
    @default NO
   */
  isPassword: NO,

  /**
    If `YES` then allow multi-line input.  This will also change the default
    tag type from "input" to "textarea".  Otherwise, pressing return will
    trigger the default insertion handler.

    @type Boolean
    @default NO
   */
  isTextArea: NO,

  /**
    Whether the text field is currently focused.

    @type Boolean
    @default NO
   */
  focused: NO,

  /**
    The hint to display while the field is not active.

    @type String
    @default ""
   */
  hint: '',

  /**
    The type attribute of the input.

    @type String
    @default "text"
   */
  type: 'text',

  /**
    This property will set a tabindex="-1" on your view if set to NO.

    This gives us control over the native tabbing behavior. When nextValidKeyView
    reaches the end of the views in the pane views tree, it won't go to a textfield
    that can accept the default tabbing behavior in any other pane. This was a
    problem when you had an alert on top of a mainPane with textfields.

    Modal panes set this to NO on all textfields that don't belong to itself.
    @type Boolean
    @default YES
   */
  isBrowserFocusable: YES,

  /**
    Whether the browser should automatically correct the input.

    When `autoCorrect` is set to `null`, the browser will use
    the system defaults.

    @type Boolean
    @default YES
   */
  autoCorrect: YES,

  /**
    Specifies the autocapitalization behavior.

    Possible values are:

     - `SC.AUTOCAPITALIZE_NONE` -- Do not autocapitalize.
     - `SC.AUTOCAPITALIZE_SENTENCES` -- Autocapitalize the first letter of each
       sentence.
     - `SC.AUTOCAPITALIZE_WORDS` -- Autocapitalize the first letter of each word.
     - `SC.AUTOCAPITALIZE_CHARACTERS` -- Autocapitalize all characters.

    Boolean values are also supported, with YES interpreted as
    `SC.AUTOCAPITALIZE_NONE` and NO as `SC.AUTOCAPITALIZE_SENTENCES`.

    When `autoCapitalize` is set to `null`, the browser will use
    the system defaults.

    @type String SC.AUTOCAPITALIZE_NONE|SC.AUTOCAPITALIZE_SENTENCES|SC.AUTOCAPITALIZE_WORDS|SC.AUTOCAPITALIZE_CHARACTERS
    @default SC.CAPITALIZE_SENTENCES
   */
  autoCapitalize: SC.CAPITALIZE_SENTENCES,

  /**
    Localizes the hint if necessary.

    @field
    @type String
   */
  formattedHint: function () {
    var hint = this.get('hint');
    return typeof(hint) === 'string' && this.get('localize') ? SC.String.loc(hint) : hint;
  }.property('hint', 'localize').cacheable(),

  /**
    Whether to show the hint while the field has focus.
    If `YES`, it will disappear as soon as any character is in the field.

    @type Boolean
    @default YES
   */
  hintOnFocus: YES,

  /**
    Whether the hint should be localized or not.

    @type Boolean
    @default YES
   */
  localize: YES,

  /**
    If `YES` then the text field is currently editing.

    @type Boolean
    @default NO
   */
  isEditing: NO,

  /**
    If you set this property to false the tab key won't trigger its default
    behavior (tabbing to the next field).

    @type Boolean
    @default YES
   */
  defaultTabbingEnabled: YES,

  /**
    Enabled context menu for textfields.

    @type Boolean
    @default YES
   */
  isContextMenuEnabled: YES,

  /**
    @deprecated Use #applyImmediately instead.

    If true, every change to the text in the text field updates `value`.
    If false, `value` is only updated when commitEditing() is called (this
    is called automatically when the text field loses focus), or whenever
    the return key is pressed while editing the field.

    @type Boolean
    @default null
   */
  continuouslyUpdatesValue: null,

  /**
    If no, will not allow transform or validation errors (SC.Error objects)
    to be passed to `value`.  Upon focus lost, the text field will revert
    to its previous value.

    @type Boolean
    @default YES
   */
  allowsErrorAsValue: YES,

  /**
    An optional view instance, or view class reference, which will be visible
    on the left side of the text field.  Visually the accessory view will look
    to be inside the field but the text editing will not overlap the accessory
    view.

    The view will be rooted to the top-left of the text field.  You should use
    a layout with 'left' and/or 'top' specified if you would like to adjust
    the offset from the top-left.

    One example use would be for a web site's icon, found to the left of the
    URL field, in many popular web browsers.

    Note:  If you set a left accessory view, the left padding of the text
    field (really, the left offset of the padding element) will automatically
    be set to the width of the accessory view, overriding any CSS you may have
    defined on the "padding" element.  If you would like to customize the
    amount of left padding used when the accessory view is visible, make the
    accessory view wider, with empty space on the right.

    @type SC.View
    @default null
   */
  leftAccessoryView: null,

  /**
    An optional view instance, or view class reference, which will be visible
    on the right side of the text field.  Visually the accessory view will
    look to be inside the field but the text editing will not overlap the
    accessory view.

    The view will be rooted to the top-right of the text field.  You should
    use a layout with 'right' and/or 'top' specified if you would like to
    adjust the offset from the top-right.  If 'left' is specified in the
    layout it will be cleared.

    One example use would be for a button to clear the contents of the text
    field.

    Note:  If you set a right accessory view, the right padding of the text
    field (really, the right offset of the padding element) will automatically
    be set to the width of the accessory view, overriding any CSS you may have
    defined on the "padding" element.  If you would like to customize the
    amount of right padding used when the accessory view is visible, make the
    accessory view wider, with empty space on the left.

    @type SC.View
    @default null
   */
  rightAccessoryView: null,

  /**
    This property will enable disable HTML5 spell checking if available on the
    browser. As of today Safari 4+, Chrome 3+ and Firefox 3+ support it.

    @type Boolean
    @default YES
   */
  spellCheckEnabled: YES,

  /**
    Maximum amount of characters this field will allow.

    @type Number
    @default 5096
   */
  maxLength: 5096,

  /**
    Whether to render a border or not.

    @type Boolean
    @default YES
   */
  shouldRenderBorder: YES,

  // ..........................................................
  // SUPPORT FOR AUTOMATIC RESIZING
  //

  /**
    Text fields support auto resizing.
    @type Boolean
    @default YES
    @see SC.AutoResize#supportsAutoResize
   */
  supportsAutoResize: YES,

  /**
    The layer to automatically resize.

    @type DOMElement
    @see SC.AutoResize#autoResizeLayer
   */
  autoResizeLayer: function () {
    return this.$input()[0];
  }.property('layer').cacheable(),

  /**
    The text to be used when automatically resizing the text field.

    @type String
    @see SC.AutoResize#autoResizeText
   */
  autoResizeText: function () {
    return this.get('value');
  }.property('value').cacheable(),

  /**
    How much padding should be used when automatically resizing.
    @type Number
    @default 20
    @see SC.AutoResize#autoResizePadding
   */
  autoResizePadding: SC.propertyFromRenderDelegate('autoResizePadding', 20),

  /** @private
    Whether to show hint or not.
   */
  _hintON: YES,

  init: function () {
    var val = this.get('value');
    this._hintON = ((!val || val && val.length === 0) && !this.get('hintOnFocus')) ? YES : NO;

    var continuouslyUpdatesValue = this.get('continouslyUpdatesValue');
    if (continuouslyUpdatesValue !== null && continuouslyUpdatesValue !== undefined) {
      this.set('applyImmediately',  continuouslyUpdatesValue);

      
      SC.Logger.warn("SC.TextFieldView#continuouslyUpdatesValue is deprecated. Please use #applyImmediately instead.");
      
    }

    return arguments.callee.base.apply(this,arguments);
  },

  /**
    This property indicates if the value in the text field can be changed.
    If set to `NO`, a `readOnly` attribute will be added to the DOM Element.

    Note if `isEnabledInPane` is `NO` this property will have no effect.

    @type Boolean
    @default YES
   */
  isEditable: YES,

  /**
    The current selection of the text field, returned as an SC.TextSelection
    object.

    Note that if the selection changes a new object will be returned -- it is
    not the case that a previously-returned SC.TextSelection object will
    simply have its properties mutated.

    @field
    @type SC.TextSelection
   */
  selection: function (key, value) {
    var element = this.$input()[0],
        range, start, end;

    // Are we being asked to set the value, or return the current value?
    if (value === undefined) {
      // The client is retrieving the value.
      if (element) {
        start = null;
        end = null;

        if (!element.value) {
          start = end = 0;
        } else {
          // In IE8, input elements don't have hasOwnProperty() defined.
          try {
            if ('selectionStart' in element) {
              start = element.selectionStart;
            }
            if ('selectionEnd' in element) {
              end = element.selectionEnd;
            }
          }
          // In Firefox when you ask the selectionStart or End of a hidden
          // input, sometimes it throws a weird error.
          // Adding this to just ignore it.
          catch (e) {
            return null;
          }

          // Support Internet Explorer.
          if (start === null  ||  end === null) {
            var selection = document.selection;
            if (selection) {
              var type = selection.type;
              if (type  &&  (type === 'None'  ||  type === 'Text')) {
                range = selection.createRange();

                if (!this.get('isTextArea')) {
                  // Input tag support.  Figure out the starting position by
                  // moving the range's start position as far left as possible
                  // and seeing how many characters it actually moved over.
                  var length = range.text.length;
                  start = Math.abs(range.moveStart('character', 0 - (element.value.length + 1)));
                  end = start + length;
                } else {
                  // Textarea support.  Unfortunately, this case is a bit more
                  // complicated than the input tag case.  We need to create a
                  // "dummy" range to help in the calculations.
                  var dummyRange = range.duplicate();
                  dummyRange.moveToElementText(element);
                  dummyRange.setEndPoint('EndToStart', range);
                  start = dummyRange.text.length;
                  end = start + range.text.length;
                }
              }
            }
          }
        }

        return SC.TextSelection.create({ start: start, end: end });
      } else {
        return null;
      }
    } else {
      // The client is setting the value.  Make sure the new value is a text
      // selection object.
      if (!value  ||  !value.kindOf  ||  !value.kindOf(SC.TextSelection)) {
        throw new Error("When setting the selection, you must specify an SC.TextSelection instance.");
      }

      if (element) {
        if (element.setSelectionRange) {
          element.setSelectionRange(value.get('start'), value.get('end'));
        } else {
          // Support Internet Explorer.
          range = element.createTextRange();
          start = value.get('start');
          range.move('character', start);
          range.moveEnd('character', value.get('end') - start);
          range.select();
        }
      }

      return value;
    }

    // Implementation note:
    // There are certain ways users can add/remove text that we can't identify
    // via our key/mouse down/up handlers (such as the user choosing Paste
    // from a menu).  So that's why we need to update our 'selection' property
    // whenever the field's value changes.
  }.property('fieldValue').cacheable(),

  // ..........................................................
  // INTERNAL SUPPORT
  //

  // Note: isEnabledInPane is required here because it is used in the renderMixin function of
  // SC.Control. It is not a display property directly in SC.Control, because the use of it in
  // SC.Control is only applied to input fields, which very few consumers of SC.Control have.
  // TODO: Pull the disabled attribute updating out of SC.Control.
  displayProperties: ['isBrowserFocusable', 'formattedHint', 'fieldValue', 'isEditing', 'isEditable', 'isEnabledInPane', 'leftAccessoryView', 'rightAccessoryView', 'isTextArea'],

  createChildViews: function () {
    arguments.callee.base.apply(this,arguments);
    this.accessoryViewObserver();
  },

  acceptsFirstResponder: function () {
    return this.get('isEnabledInPane');
  }.property('isEnabledInPane'),

  accessoryViewObserver: function () {
    var classNames,
        viewProperties = ['leftAccessoryView', 'rightAccessoryView'],
        len = viewProperties.length, i, viewProperty, previousView,
        accessoryView;

    for (i = 0; i < len; i++) {
      viewProperty = viewProperties[i];

      // Is there an accessory view specified?
      previousView = this['_' + viewProperty];
      accessoryView = this.get(viewProperty);

      // If the view is the same, there's nothing to do.  Otherwise, remove
      // the old one (if any) and add the new one.
      if (! (previousView &&
             accessoryView &&
             (previousView === accessoryView))) {

        // If there was a previous previous accessory view, remove it now.
        if (previousView) {
          // Remove the "sc-text-field-accessory-view" class name that we had
          // added earlier.
          classNames = previousView.get('classNames');
          classNames = classNames.without('sc-text-field-accessory-view');
          previousView.set('classNames', classNames);

          if (previousView.createdByParent) {
            this.removeChildAndDestroy(previousView);
          } else {
            this.removeChild(previousView);
          }

          // Tidy up.
          previousView = this['_' + viewProperty] = this['_created' + viewProperty] = null;
        }

        // If there's a new accessory view to add, do so now.
        if (accessoryView) {
          // If the user passed in a class rather than an instance, create an
          // instance now.
          accessoryView = this.createChildView(accessoryView);

          // Fix up right accessory views to be right positioned.
          if (viewProperty === 'rightAccessoryView') {
            var layout = accessoryView.get('layout');

            accessoryView.adjust({ left: null, right: layout.right || 0 });
          }

          // Add in the "sc-text-field-accessory-view" class name so that the
          // z-index gets set correctly.
          classNames = accessoryView.get('classNames');
          var className = 'sc-text-field-accessory-view';
          if (classNames.indexOf(className) < 0) {
            classNames = SC.clone(classNames);
            classNames.push(className);
            accessoryView.set('classNames', classNames);
          }

          // Actually add the view to our hierarchy and cache a reference.
          this.appendChild(accessoryView);
          this['_' + viewProperty] = accessoryView;
        }
      }
    }
  }.observes('leftAccessoryView', 'rightAccessoryView'),

  render: function (context, firstTime) {
    var v, accessoryViewWidths, leftAdjustment, rightAdjustment;

    // always have at least an empty string
    v = this.get('fieldValue');
    if (SC.none(v)) v = '';
    v = String(v);

    // update layer classes always
    context.setClass('not-empty', v.length > 0);

    // If we have accessory views, we'll want to update the padding on the
    // hint to compensate for the width of the accessory view.  (It'd be nice
    // if we could add in the original padding, too, but there's no efficient
    // way to do that without first rendering the element somewhere on/off-
    // screen, and we don't want to take the performance hit.)
    accessoryViewWidths = this._getAccessoryViewWidths();
    leftAdjustment  = accessoryViewWidths.left;
    rightAdjustment = accessoryViewWidths.right;

    if (leftAdjustment)  leftAdjustment  += 'px';
    if (rightAdjustment) rightAdjustment += 'px';

    this._renderField(context, firstTime, v, leftAdjustment, rightAdjustment);
  },

  /** @private
    If isTextArea is changed (this might happen in inlineeditor constantly)
    force the field render to render like the firsttime to avoid writing extra
    code. This can be useful also
   */
  _forceRenderFirstTime: NO,

  /** @private */
  _renderFieldLikeFirstTime: function () {
    this.set('_forceRenderFirstTime', YES);
  }.observes('isTextArea'),

  /** @private */
  _renderField: function (context, firstTime, value, leftAdjustment, rightAdjustment) {
    // TODO:  The cleanest thing might be to create a sub- rendering context
    //        here, but currently SC.RenderContext will render sibling
    //        contexts as parent/child.
    var hint = this.get('formattedHint'),
      hintOnFocus = this.get('hintOnFocus'),
      hintString = '',
      maxLength = this.get('maxLength'),
      isTextArea = this.get('isTextArea'),
      isEnabledInPane = this.get('isEnabledInPane'),
      isEditable = this.get('isEditable'),
      autoCorrect = this.get('autoCorrect'),
      autoCapitalize = this.get('autoCapitalize'),
      isBrowserFocusable = this.get('isBrowserFocusable'),
      spellCheckString = '', autocapitalizeString = '', autocorrectString = '',
      activeStateString = '', browserFocusableString = '',
      name, adjustmentStyle, type, paddingElementStyle,
      fieldClassNames, isOldSafari;

    context.setClass('text-area', isTextArea);

    //Adding this to differentiate between older and newer versions of safari
    //since the internal default field padding changed
    isOldSafari = SC.browser.isWebkit &&
        SC.browser.compare(SC.browser.engineVersion, '532') < 0;
    context.setClass('oldWebKitFieldPadding', isOldSafari);


    if (firstTime || this._forceRenderFirstTime) {
      this._forceRenderFirstTime = NO;
      activeStateString = isEnabledInPane ? (isEditable ? '' : ' readonly="readonly"') : ' disabled="disabled"';
      name = this.get('layerId');

      spellCheckString = this.get('spellCheckEnabled') ? ' spellcheck="true"' : ' spellcheck="false"';

      if (!SC.none(autoCorrect)) {
        autocorrectString = ' autocorrect=' + (!autoCorrect ? '"off"' : '"on"');
      }

      if (!SC.none(autoCapitalize)) {
        if (SC.typeOf(autoCapitalize) === 'boolean') {
          autocapitalizeString = ' autocapitalize=' + (!autoCapitalize ? '"none"' : '"sentences"');
        } else {
          autocapitalizeString = ' autocapitalize=' + autoCapitalize;
        }
      }

      if (!isBrowserFocusable) {
        browserFocusableString = ' tabindex="-1"';
      }

        // if hint is on and we don't want it to show on focus, create one
      if (SC.platform.input.placeholder && !hintOnFocus) {
        hintString = ' placeholder="' + hint + '"';
      }

      if (this.get('shouldRenderBorder')) context.push('<div class="border"></div>');

      // Render the padding element, with any necessary positioning
      // adjustments to accommodate accessory views.
      adjustmentStyle = '';
      if (leftAdjustment || rightAdjustment) {
        adjustmentStyle = 'style="';
        if (leftAdjustment)  adjustmentStyle += 'left:'  + leftAdjustment  + ';';
        if (rightAdjustment) adjustmentStyle += 'right:' + rightAdjustment + ';';
        adjustmentStyle += '"';
      }
      context.push('<div class="padding" ' + adjustmentStyle + '>');

      value = this.get('escapeHTML') ? SC.RenderContext.escapeHTML(value) : value;
      if (this._hintON && !SC.platform.input.placeholder && (!value || (value && value.length === 0))) {
        value = hint;
        context.setClass('sc-hint', YES);
      }

      if (hintOnFocus) {
        var hintStr = '<div aria-hidden="true" class="hint ' +
                      (isTextArea ? '':'ellipsis') + '%@">' + hint + '</div>';
        context.push(hintStr.fmt(value ? ' sc-hidden': ''));
      }

      fieldClassNames = "field";

      // Render the input/textarea field itself, and close off the padding.
      if (isTextArea) {
        context.push('<textarea aria-label="' + hint + '" class="' + fieldClassNames + '" aria-multiline="true"' +
                      '" name="' + name + '"' + activeStateString + hintString +
                      spellCheckString + autocorrectString + autocapitalizeString +
                      browserFocusableString + ' maxlength="' + maxLength +
                      '">' + value + '</textarea></div>');
      } else {
        type = this.get('type');

        // Internet Explorer won't let us change the type attribute later
        // so we force it to password if needed now, or if the value is not the hint
        if (this.get('isPassword')) {
          
          SC.Logger.warn("SC.TextFieldView#isPassword is deprecated. Please set SC.TextFieldView#type to password instead.");
          

          type = 'password';
        }

        context.push('<input aria-label="' + hint + '" class="' + fieldClassNames + '" type="' + type +
                      '" name="' + name + '"' + activeStateString + hintString +
                      spellCheckString + autocorrectString + autocapitalizeString +
                      browserFocusableString + ' maxlength="' + maxLength +
                      '" value="' + value + '"' + '/></div>');
      }
    } else {
      var input = this.$input(),
        element = input[0],
        val = this.get('value');

      if (hintOnFocus) context.$('.hint')[0].innerHTML = hint;
      else if (!hintOnFocus) element.placeholder = hint;

      // IE8 has problems aligning the input text in the center
      // This is a workaround for centering it.
      if (SC.browser.name === SC.BROWSER.ie && SC.browser.version <= 8 && !isTextArea) {
        input.css('line-height', this.get('frame').height + 'px');
      }

      if (!val || (val && val.length === 0)) {
        if (this.get('isPassword')) { element.type = 'password'; }

        if (!SC.platform.input.placeholder && this._hintON) {
          if (!this.get('isFirstResponder')) {
            // Internet Explorer doesn't allow you to modify the type afterwards
            // jQuery throws an exception as well, so set attribute directly
            context.setClass('sc-hint', YES);
            input.val(hint);
          } else {
            // Internet Explorer doesn't allow you to modify the type afterwards
            // jQuery throws an exception as well, so set attribute directly
            context.setClass('sc-hint', NO);
            input.val('');
          }
        }
      }

      if (!SC.none(autoCorrect)) {
        input.attr('autocorrect', !autoCorrect ? 'off' : 'on');
      } else {
        input.attr('autocorrect', null);
      }

      if (!SC.none(autoCapitalize)) {
        if (SC.typeOf(autoCapitalize) == 'boolean') {
          input.attr('autocapitalize', !autoCapitalize ? 'none' : 'sentences');
        } else {
          input.attr('autocapitalize', autoCapitalize);
        }
      } else {
        input.attr('autocapitalize', null);
      }

      if (!hintOnFocus && SC.platform.input.placeholder) input.attr('placeholder', hint);

      if (isBrowserFocusable) {
        input.removeAttr('tabindex');
      } else {
        input.attr('tabindex', '-1');
      }

      // Enable/disable the actual input/textarea as appropriate.
      if (!isEditable) {
        input.attr('readOnly', true);
      } else {
        input.attr('readOnly', null);
      }

      if (element) {
        // Adjust the padding element to accommodate any accessory views.
        paddingElementStyle = element.parentNode.style;
        if (leftAdjustment) {
          if (paddingElementStyle.left !== leftAdjustment) {
            paddingElementStyle.left = leftAdjustment;
          }
        } else {
          paddingElementStyle.left = null;
        }

        if (rightAdjustment) {
          if (paddingElementStyle.right !== rightAdjustment) {
            paddingElementStyle.right = rightAdjustment;
          }
        } else {
          paddingElementStyle.right = null;
        }
      }
    }
  },

  _getAccessoryViewWidths: function () {
    var widths = {},
        accessoryViewPositions = ['left', 'right'],
        numberOfAccessoryViewPositions = accessoryViewPositions.length, i,
        position, accessoryView, width, layout, offset, frame;
    for (i = 0;  i < numberOfAccessoryViewPositions;  i++) {
      position = accessoryViewPositions[i];
      accessoryView = this['_' + position + 'AccessoryView'];
      if (accessoryView && accessoryView.isObservable) {
        frame = accessoryView.get('frame');
        if (frame) {
          width = frame.width;
          if (width) {
            // Also account for the accessory view's inset.
            layout = accessoryView.get('layout');
            if (layout) {
              offset = layout[position];
              width += offset;
            }
            widths[position] = width;
          }
        }
      }
    }
    return widths;
  },

  // ..........................................................
  // HANDLE NATIVE CONTROL EVENTS
  //

  /**
    Override of SC.FieldView.prototype.didCreateLayer.
  */
  didCreateLayer: function () {
    arguments.callee.base.apply(this,arguments);

    if (!SC.platform.input.placeholder) this.invokeLast(this._setInitialPlaceHolderIE);
    // For some strange reason if we add focus/blur events to textarea
    // inmediately they won't work. However if I add them at the end of the
    // runLoop it works fine.
    if (this.get('isTextArea')) {
      this.invokeLast(this._addTextAreaEvents);
    } else {
      this._addTextAreaEvents();

      // In Firefox, for input fields only (that is, not textarea elements),
      // if the cursor is at the end of the field, the "down" key will not
      // result in a "keypress" event for the document (only for the input
      // element), although it will be bubbled up in other contexts.  Since
      // SproutCore's event dispatching requires the document to see the
      // event, we'll manually forward the event along.
      if (SC.browser.isMozilla) {
        var input = this.$input();
        SC.Event.add(input, 'keypress', this, this._firefox_dispatch_keypress);
      }
    }
  },

  /**
    SC.View view state callback.

    Once the view is appended, fix up the text layout to sc-hints and inputs.
  */
  didAppendToDocument: function () {
    this._fixupTextLayout();
  },

  /** @private
    Apply proper text layout to sc-hints and inputs.
   */
  _fixupTextLayout: function () {
    var height = this.get('frame').height;

    if (SC.browser.name === SC.BROWSER.ie && SC.browser.version <= 8 &&
        !this.get('isTextArea')) {
      this.$input().css('line-height', height + 'px');
    }

    if (this.get('hintOnFocus') && !this.get('isTextArea')) {
      var hintJQ = this.$('.hint');

      hintJQ.css('line-height', hintJQ.outerHeight() + 'px');
    }
  },

  /** @private
    Set initial placeholder for IE
   */
  _setInitialPlaceHolderIE: function () {
    if (!SC.platform.input.placeholder && this._hintON) {
      var input = this.$input(),
          currentValue = input.val();
      if (!currentValue || (currentValue && currentValue.length === 0)) {
        input.val(this.get('formattedHint'));
      }
    }
  },

  /** @private
    Adds all the textarea events. This functions is called by didCreateLayer
    at different moments depending if it is a textarea or not. Appending
    events to text areas is not reliable unless the element is already added
    to the DOM.
   */
  _addTextAreaEvents: function () {
    var input = this.$input();
    SC.Event.add(input, 'focus', this, this._textField_fieldDidFocus);
    SC.Event.add(input, 'blur',  this, this._textField_fieldDidBlur);

    // There are certain ways users can select text that we can't identify via
    // our key/mouse down/up handlers (such as the user choosing Select All
    // from a menu).
    SC.Event.add(input, 'select', this, this._textField_selectionDidChange);

    // handle a "paste" from app menu and context menu
    SC.Event.add(input, 'input', this, this._textField_inputDidChange);
  },

  /**
    Removes all the events attached to the textfield
   */
  willDestroyLayer: function () {
    arguments.callee.base.apply(this,arguments);

    var input = this.$input();
    SC.Event.remove(input, 'focus',  this, this._textField_fieldDidFocus);
    SC.Event.remove(input, 'blur',   this, this._textField_fieldDidBlur);
    SC.Event.remove(input, 'select', this, this._textField_selectionDidChange);
    SC.Event.remove(input, 'keypress',  this, this._firefox_dispatch_keypress);
    SC.Event.remove(input, 'input', this, this._textField_inputDidChange);
  },

  /** @private
     This function is called by the event when the textfield gets focus
  */
  _textField_fieldDidFocus: function (evt) {
    SC.run(function () {
      this.set('focused', YES);
      this.fieldDidFocus(evt);
      var val = this.get('value');
      if (!SC.platform.input.placeholder && ((!val) || (val && val.length === 0))) {
        this._hintON = NO;
      }
    }, this);
  },

  /** @private
    This function is called by the event when the textfield blurs
   */
  _textField_fieldDidBlur: function (evt) {
    SC.run(function () {
      this.set('focused', NO);
      // passing the original event here instead that was potentially set from
      // losing the responder on the inline text editor so that we can
      // use it for the delegate to end editing
      this.fieldDidBlur(this._origEvent || evt);
      var val = this.get('value');
      if (!SC.platform.input.placeholder && !this.get('hintOnFocus') && ((!val) || (val && val.length === 0))) {
        this._hintON = YES;
      }
    }, this);
  },

  fieldDidFocus: function (evt) {
    this.becomeFirstResponder();

    this.beginEditing(evt);

    // We have to hide the intercept pane, as it blocks the events.
    // However, show any that we previously hid, first just in case something wacky happened.
    if (this._didHideInterceptForPane) {
      this._didHideInterceptForPane.showTouchIntercept();
      this._didHideInterceptForPane = null;
    }

    // now, hide the intercept on this pane if it has one
    var pane = this.get('pane');
    if (pane && pane.get('hasTouchIntercept')) {
      // hide
      pane.hideTouchIntercept();

      // and set our internal one so we can unhide it (even if the pane somehow changes)
      this._didHideInterceptForPane = this.get("pane");
    }
  },

  fieldDidBlur: function (evt) {
    this.resignFirstResponder(evt);

    if (this.get('commitOnBlur')) this.commitEditing(evt);

    // get the pane we hid intercept pane for (if any)
    var touchPane = this._didHideInterceptForPane;
    if (touchPane) {
      touchPane.showTouchIntercept();
      touchPane = null;
    }
  },

  /** @private */
  _field_fieldValueDidChange: function (evt) {
    if (this.get('focused')) {
      SC.run(function () {
        this.fieldValueDidChange(NO);
      }, this);
    }
    this.updateHintOnFocus();
  },

  /** @private
    Context-menu paste does not trigger fieldValueDidChange normally. To do so, we'll capture the
    input event and avoid duplicating the "fieldValueDidChange" call if it was already issued elsewhere.

    I welcome someone else to find a better solution to this problem. However, please make sure that it
    works with pasting via shortcut, context menu and the application menu on *All Browsers*.
   */
  _textField_inputDidChange: function () {
    var timerNotPending = SC.empty(this._fieldValueDidChangeTimer) || !this._fieldValueDidChangeTimer.get('isValid');
    if (this.get('applyImmediately') && timerNotPending) {
      this.invokeLater(this.fieldValueDidChange, 10);
    }
  },

  /** @private
    Make sure to update visibility of hint if it changes
   */
  updateHintOnFocus: function () {
    // if there is a value in the field, hide the hint
    var hintOnFocus = this.get('hintOnFocus');
    if (!hintOnFocus) return;

    if (this.getFieldValue()) {
      this.$('.hint').addClass('sc-hidden');
    } else {
      this.$('.hint').removeClass('sc-hidden');
      this._fixupTextLayout();
    }
  }.observes('value'),

  /** @private
    Move magic number out so it can be over-written later in inline editor
   */
  _topOffsetForFirefoxCursorFix: 3,

  /** @private
    In Firefox, as of 3.6 -- including 3.0 and 3.5 -- for input fields only
    (that is, not textarea elements), if the cursor is at the end of the
    field, the "down" key will not result in a "keypress" event for the
    document (only for the input element), although it will be bubbled up in
    other contexts.  Since SproutCore's event dispatching requires the
    document to see the event, we'll manually forward the event along.
   */
  _firefox_dispatch_keypress: function (evt) {
    var selection = this.get('selection'),
        value     = this.get('value'),
        valueLen  = value ? value.length : 0,
        responder;

    if (!selection || ((selection.get('length') === 0 && (selection.get('start') === 0) || selection.get('end') === valueLen))) {
      responder = SC.RootResponder.responder;
      if (evt.keyCode === 9) return;
      responder.keypress.call(responder, evt);
      evt.stopPropagation();
    }
  },

  /** @private */
  _textField_selectionDidChange: function () {
    this.notifyPropertyChange('selection');
  },

  // ..........................................................
  // FIRST RESPONDER SUPPORT
  //
  // When we become first responder, make sure the field gets focus and
  // the hint value is hidden if needed.

  /** @private
    When we become first responder, focus the text field if needed and
    hide the hint text.
   */
  didBecomeKeyResponderFrom: function (keyView) {
    if (this.get('isVisibleInWindow')) {
      var inp = this.$input()[0];
      try {
        if (inp) inp.focus();
      } catch (e) {}

      if (!this._txtFieldMouseDown) {
        this.invokeLast(this._selectRootElement);
      }
    }
  },

  /** @private
    In IE, you can't modify functions on DOM elements so we need to wrap the
    call to select() like this.
   */
  _selectRootElement: function () {
    var inputElem = this.$input()[0],
        isLion;
    // Make sure input element still exists, as a redraw could have remove it
    // already.
    if (inputElem) {
      // Determine if the OS is OS 10.7 "Lion"
      isLion = SC.browser.os === SC.OS.mac &&
          SC.browser.compare(SC.browser.osVersion, '10.7') === 0;

      if (!(SC.browser.name === SC.BROWSER.safari &&
            isLion && SC.buildLocale === 'ko-kr')) {
        inputElem.select();
      }
    }
    else this._textField_selectionDidChange();
  },

  /** @private
    When we lose first responder, blur the text field if needed and show
    the hint text if needed.
   */
  didLoseKeyResponderTo: function (keyView) {
    var el = this.$input()[0];
    if (el) el.blur();
    this.invokeLater("scrollToOriginIfNeeded", 100);
  },

  /** @private
    Scrolls to origin if necessary (if the pane's current firstResponder is not a text field).
   */
  scrollToOriginIfNeeded: function () {
    var pane = this.get("pane");
    if (!pane) return;

    var first = pane.get("firstResponder");
    if (!first || !first.get("isTextField")) {
      document.body.scrollTop = document.body.scrollLeft = 0;
    }
  },

  /** @private */
  keyDown: function (evt) {
    return this.interpretKeyEvents(evt) || NO;
  },

  /** @private */
  insertText: function (chr, evt) {
    var which = evt.which,
        keyCode = evt.keyCode,
        maxLengthReached = false;

    // maxlength for textareas
    if (!SC.platform.input.maxlength && this.get('isTextArea')) {
      var val = this.get('value');

      // This code is nasty. It's thanks gecko .keycode table that has charters like & with the same keycode as up arrow key
      if (val && ((!SC.browser.isMozilla && which > 47) ||
                  (SC.browser.isMozilla && ((which > 32 && which < 43) || which > 47) && !(keyCode > 36 && keyCode < 41))) &&
          (val.length >= this.get('maxLength'))) {
        maxLengthReached = true;
      }
    }
    // validate keyDown...
    // do not validate on touch, as it prevents return.
    if ((this.performValidateKeyDown(evt) || SC.platform.touch) && !maxLengthReached) {
      evt.allowDefault();
    } else {
      evt.stop();
    }

    if (this.get('applyImmediately')) {
      // This has gone back and forth several times between invokeLater and setTimeout.
      // Now we're back to invokeLater, please read the code comment above
      // this._textField_inputDidChange before changing it again.
      this._fieldValueDidChangeTimer = this.invokeLater(this.fieldValueDidChange, 10);
    }

    return YES;
  },

  /** @private */
  insertTab: function (evt) {
    // Don't handle if default tabbing hasn't been enabled.
    if (!this.get('defaultTabbingEnabled')) {
      evt.preventDefault();
      return false;
    }

    // Otherwise, handle.
    var view = this.get('nextValidKeyView');
    if (view) view.becomeFirstResponder();
    else evt.allowDefault();
    return YES; // handled
  },

  /** @private */
  insertBacktab: function (evt) {
    // Don't handle if default tabbing hasn't been enabled.
    if (!this.get('defaultTabbingEnabled')) {
      evt.preventDefault();
      return false;
    }

    // Otherwise, handle.
    var view = this.get('previousValidKeyView');
    if (view) view.becomeFirstResponder();
    else evt.allowDefault();
    return YES; // handled
  },

  /**
    @private

    Invoked when the user presses return.  If this is a multi-line field,
    then allow the newline to proceed.  Otherwise, try to commit the
    edit.
  */
  insertNewline: function (evt) {
    if (this.get('isTextArea') || evt.isIMEInput) {
      evt.allowDefault();
      return YES; // handled
    }
    return NO;
  },

  /** @private */
  deleteForward: function (evt) {
    evt.allowDefault();
    return YES;
  },

  /** @private */
  deleteBackward: function (evt) {
    evt.allowDefault();
    return YES;
  },

  /** @private */
  moveLeft: function (evt) {
    evt.allowDefault();
    return YES;
  },

  /** @private */
  moveRight: function (evt) {
    evt.allowDefault();
    return YES;
  },

  /** @private */
  selectAll: function (evt) {
    evt.allowDefault();
    return YES;
  },

  /** @private */
  moveUp: function (evt) {
    if (this.get('isTextArea')) {
      evt.allowDefault();
      return YES;
    }
    return NO;
  },

  /** @private */
  moveDown: function (evt) {
    if (this.get('isTextArea')) {
      evt.allowDefault();
      return YES;
    }
    return NO;
  },

  keyUp: function (evt) {
    if (SC.browser.isMozilla &&
        evt.keyCode === SC.Event.KEY_RETURN) { this.fieldValueDidChange(); }

    // The caret/selection could have moved.  In some browsers, though, the
    // element's values won't be updated until after this event is finished
    // processing.
    this.notifyPropertyChange('selection');
    evt.allowDefault();
    return YES;
  },

  mouseDown: function (evt) {
    if (!this.get('isEnabledInPane')) {
      evt.stop();
      return YES;
    } else {
      this._txtFieldMouseDown = YES;
      this.becomeFirstResponder();

      return arguments.callee.base.apply(this,arguments);
    }
  },

  mouseUp: function (evt) {
    this._txtFieldMouseDown = NO;

    if (!this.get('isEnabledInPane')) {
      evt.stop();
      return YES;
    }

    // The caret/selection could have moved.  In some browsers, though, the
    // element's values won't be updated until after this event is finished
    // processing.
    this.notifyPropertyChange('selection');
    return arguments.callee.base.apply(this,arguments);
  },

  touchStart: function (evt) {
    return this.mouseDown(evt);
  },

  touchEnd: function (evt) {
    return this.mouseUp(evt);
  },

  /**
    Adds mouse wheel support for textareas.
   */
  mouseWheel: function (evt) {
    if (this.get('isTextArea')) {
      evt.allowDefault();
      return YES;
    } else return NO;
  },

  /**
    Allows text selection in IE. We block the IE only event selectStart to
    block text selection in all other views.
   */
  selectStart: function (evt) {
    return YES;
  },

  /** @private
    Overridden from SC.FieldView. Provides correct tag name based on the
    `isTextArea` property.
   */
  _inputElementTagName: function () {
    if (this.get('isTextArea')) {
      return 'textarea';
    } else {
      return 'input';
    }
  },

  /** @private
    This observer makes sure to hide the hint when a value is entered, or
    show it if it becomes empty.
   */
  _valueObserver: function () {
    var val = this.get('value'), max;
    if (val && val.length > 0) {
      this._hintON = NO;

      max = this.get('maxLength');
      if (!SC.platform.input.maxlength && val.length > max) {
        this.set('value', val.substr(0, max));
      }
    } else if (!this.get('hintOnFocus')) {
      this._hintON = YES;
    }
  }.observes('value')

});

/* >>>>>>>>>> BEGIN source/views/inline_text_field.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('views/text_field') ;
sc_require('system/utils/misc') ;
sc_require('delegates/inline_text_field');
sc_require('mixins/inline_editor');

/**
  @class

  The inline text editor is used to display an editable area for controls
  that are not always editable such as label views and source list views.

  You generally will not use the inline editor directly but instead will
  invoke beginEditing() and endEditing() on the views you are
  editing. If you would like to use the inline editor for your own views,
  you can do that also by using the editing API described here.

  ## Using the Inline Editor in Your Own Views

  To use the inlineEditor on a custom view you should mixin SC.InlineEditable on
  it. SC.InlineTextFieldView is the default editor so you do not need to do any
  other setup. The class methods beginEditing, commitEditing, and discardEditing
  still exist for backwards compatibility but should not be used on new views.

      MyProject.MyView = SC.View.extend(SC.InlineEditable, {
      });

  ### Starting the Editor

  The inline editor works by positioning itself over the top of your view
  with the same offset, width, and font information.

  To start it simply call beginEditing on your view.

      myView.beginEditing();

  By default, if the inline editor is currently in use elsewhere, it will automatically
  close itself over there and begin editing for your view instead. This behavior
  is defined by the inlineEditorDelegate of your view, and can be changed by using
  one other than the default.

  ## Customizing the editor

  The editor has several parameters that can be used to customize it to your
  needs. These options should be set on the editor passed to your delegate's (or
  view's) inlineEditorWillBeginEditing method:

   - `exampleFrame` -- The editors initial frame in viewport coordinates.
   - `value` -- Initial value of the edit field.
   - `exampleElement` -- A DOM element to use when copying styles.
   - `multiline` -- If YES then the hitting return will add to the value instead
     of exiting the inline editor.
   - `commitOnBlur` -- If YES then blurring will commit the value, otherwise it
     will discard the current value.  Defaults to YES.
   - `validator` -- Validator to be attached to the field.

  For backwards compatibility, calling the class method beginEditing with an
  options hash will translate the values in the hash to the correct settings on
  the editor.

  ## Committing or Discarding Changes

  Normally the editor will automatically commit or discard its changes
  whenever the user exits the edit mode by pressing enter, escape, or clicking
  elsewhere on the page. If you need to force the editor to end editing, you can
  do so by calling commitEditing() or discardEditing():

      myView.commitEditing();
      myView.discardEditing();

  Both methods will try to end the editing context and will call the
  relevant delegate methods on the inlineEditorDelegate set on your view.

  Note that it is possible an editor may not be able to commit editing
  changes because either the delegate disallowed it or because its validator
  failed.  In this case commitEditing() will return NO.  If you want to
  end editing anyway, you can discard the editing changes instead by calling
  discardEditing().  This method will generally succeed unless your delegate
  refuses it as well.

  @extends SC.TextFieldView
  @since SproutCore 1.0
*/
SC.InlineTextFieldView = SC.TextFieldView.extend(SC.InlineEditor,
/** @scope SC.InlineTextFieldView.prototype */ {
  classNames: ['inline-editor'],

  /**
    Over-write magic number from SC.TextFieldView
  */
  _topOffsetForFirefoxCursorFix: 0,

  /**
    The default size of the inline text field is 0 x 0 so that when it is
    appended, but before it is positioned it doesn't fill the parent view
    entirely.

    This is important, because if the parent view layer allows overflow,
    we could inadvertently alter the scrollTop or scrollLeft properties
    of the layer.
    */
  layout: { height: 0, width: 0 },

  /*
    @private

    Prevents the view from taking part in child view layout plugins.
  */
  useAbsoluteLayout: YES,

  /*
  * @private
  * @method
  *
  * Scans the given element for presentation styles from css.
  *
  * @params {element} the dom element to scan
  * @returns {String} a style string that was copied from the element
  */
  _updateViewStyle: function(el) {
    var styles = '',
        s=SC.getStyle(el,'font-size');

    if(s && s.length>0) styles = styles + "font-size: "+ s + " !important; ";

    s=SC.getStyle(el,'font-family');
    if(s && s.length>0) styles = styles + "font-family: " + s + " !important; ";

    s=SC.getStyle(el,'font-weight');
    if(s && s.length>0) styles = styles + "font-weight: " + s + " !important; ";

    s=SC.getStyle(el,'z-index');
    if(s && s.length>0) styles = styles + "z-index: " + s + " !important; ";

    s=SC.getStyle(el,'line-height');
    if(s && s.length>0) styles = styles + "line-height: " + s + " !important; ";

    s=SC.getStyle(el,'text-align');
    if(s && s.length>0) styles = styles + "text-align: " + s + " !important; ";

    s=SC.getStyle(el,'top-margin');
    if(s && s.length>0) styles = styles + "top-margin: " + s + " !important; ";

    s=SC.getStyle(el,'bottom-margin');
    if(s && s.length>0) styles = styles + "bottom-margin: " + s + " !important; ";

    s=SC.getStyle(el,'left-margin');
    if(s && s.length>0) styles = styles + "left-margin: " + s + " !important; ";

    s=SC.getStyle(el,'right-margin');
    if(s && s.length>0) styles = styles + "right-margin: " + s + " !important; ";

    return styles;
  },

  /*
  * @private
  * @method
  *
  * Scans the given element for positioning styles from css.
  *
  * @params {element} the dom element to scan
  * @returns {String} a style string copied from the element
  */
  _updateViewPaddingStyle: function(el) {
    var styles = '',
    s=SC.getStyle(el,'padding-top');

    if(s && s.length>0) styles = styles + "top: "+ s + " !important; ";

    s=SC.getStyle(el,'padding-bottom');
    if(s && s.length>0) styles = styles + "bottom: " + s + " !important; ";

    s=SC.getStyle(el,'padding-left');
    if(s && s.length>0) styles = styles + "left: " + s + " !important; ";

    s=SC.getStyle(el,'padding-right');
    if(s && s.length>0) styles = styles + "right: " + s + " !important; ";

    return styles;
	},

  /*
  * @private
  * @method
  *
  * Scans the given element for styles and copies them into a style element in
  * the head. This allows the styles to be overridden by css matching classNames
  * on the editor.
  *
  * @params {element} the dom element to copy
  */
	updateStyle: function(exampleElement) {
    if(exampleElement.length) exampleElement = exampleElement[0];

    // the styles are placed into a style element so that they can be overridden
    // by your css based on the editor className
    var styleElement = document.getElementById('sc-inline-text-field-style'),
		s = this._updateViewStyle(exampleElement),
		p = this._updateViewPaddingStyle(exampleElement),

		str = ".inline-editor input{"+s+"}" +
					".inline-editor textarea{"+s+"}" +
					".inline-editor .padding{"+p+"}";

    // the style element is lazily created
    if(!styleElement) {
      var head = document.getElementsByTagName('head')[0];
      styleElement = document.createElement('style');

      styleElement.type= 'text/css';
      styleElement.media= 'screen';
      styleElement.id = 'sc-inline-text-field-style';

      head.appendChild(styleElement);
    }

    // now that we know the element exists, write the styles

    // IE method
    if(styleElement.styleSheet) styleElement.styleSheet.cssText= str;
    // other browsers
    else styleElement.innerHTML = str;
	},

  /*
  * @method
  *
  * Positions the editor over the target view.
  *
  * If you want to tweak the positioning of the editor, you may pass a custom
  * frame for it to position itself on.
  *
  * @param {SC.View} the view to be positioned over
  * @param {Hash} optional custom frame
  * @param {Boolean} if the view is a member of a collection
  */
	positionOverTargetView: function(target, exampleFrame, elem, _oldExampleFrame, _oldElem) {
    var targetLayout = target.get('layout'),
        layout = {};

    // Deprecates isCollection and pane arguments by fixing them up if they appear.
    if (!SC.none(_oldExampleFrame)) {
      exampleFrame = _oldExampleFrame;
      elem = _oldElem;

      
      SC.warn("Developer Warning: the isCollection and pane arguments have been deprecated and can be removed.  The inline text field will now position itself within the same parent element as the target, thus removing the necessity to calculate the position of the target relative to the pane.");
      
    }

    // In case where the label is part of an SC.ListItemView
    if (exampleFrame && elem) {
      var frame = SC.offset(elem, 'parent');

      layout.top = targetLayout.top + frame.y - exampleFrame.height/2;
      layout.left = targetLayout.left + frame.x;
      layout.height = exampleFrame.height;
      layout.width = exampleFrame.width;
    } else {
      layout = SC.copy(targetLayout);
    }

    this.set('layout', layout);
  },

  /*
  * Flag indicating whether the editor is allowed to use multiple lines.
  * If set to yes it will be rendered using a text area instead of a text input.
  *
  * @type {Boolean}
  */
  multiline: NO,

  /*
  * Translates the multiline flag into something TextFieldView understands.
  *
  * @type {Boolean}
  */
  isTextArea: function() {
    return this.get('multiline');
  }.property('multiline').cacheable(),

  /*
  * Begins editing the given view, positions the editor on top of the view, and
  * copies the styling of the view onto the editor.
  *
  * @params {SC.InlineEditable} the view being edited
  *
  * @returns {Boolean} YES on success
  */
  beginEditing: function(original, label) {
		if(!original(label)) return NO;

    var pane = label.get('pane'),
      elem = this.get('exampleElement');

    this.beginPropertyChanges();

    if (label.multiline) this.set('multiline', label.multiline);

    // if we have an exampleElement we need to make sure it's an actual
    // DOM element not a jquery object
    if (elem) {
      if(elem.length) elem = elem[0];
    }

    // if we don't have an element we need to get it from the target
    else {
      elem = label.$()[0];
    }

    this.updateStyle(elem);

    this.positionOverTargetView(label, this.get('exampleFrame'), elem);

    this._previousFirstResponder = pane ? pane.get('firstResponder') : null;
    this.becomeFirstResponder();
    this.endPropertyChanges() ;

    return YES;
  }.enhance(),

  /**
    Invoked whenever the editor loses (or should lose) first responder
    status to commit or discard editing.

    @returns {Boolean}
  */
  // TODO: this seems to do almost the same thing as fieldDidBlur
  blurEditor: function(evt) {
    if (!this.get('isEditing')) return YES ;
    return this.commitOnBlur ? this.commitEditing() : this.discardEditing();
  },

  /**
    @method
    @private

    Called by commitEditing and discardEditing to actually end editing.

  */
  _endEditing: function(original) {
    var ret = original();

    // resign first responder if not done already.  This may call us in a
    // loop but since isEditing is already NO, nothing will happen.
    if (this.get('isFirstResponder')) {
      var pane = this.get('pane');
      if (pane && this._previousFirstResponder) {
        pane.makeFirstResponder(this._previousFirstResponder);
      } else this.resignFirstResponder();
    }
    this._previousFirstResponder = null ; // clearout no matter what

    return ret;
  }.enhance(),

  // TODO: make textArea automatically resize to fit content

  /** @private */
  mouseDown: function(e) {
    arguments.callee.base.call(this, e) ;
    return this.get('isEditing');
  },

  touchStart: function(e){
    this.mouseDown(e);
  },

  _scitf_blurInput: function() {
    var el = this.$input()[0];
    if (el) el.blur();
    el = null;
  },

  // [Safari] if you don't take key focus away from an element before you
  // remove it from the DOM key events are no longer sent to the browser.
  /** @private */
  willRemoveFromParent: function() {
    return this._scitf_blurInput();
  },

  // ask owner to end editing.
  /** @private */
  willLoseFirstResponder: function(responder, evt) {
    if (responder !== this) return;

    // if we're about to lose first responder for any reason other than
    // ending editing, make sure we clear the previous first responder so
    // isn't cached
    this._previousFirstResponder = null;

    // store the original event that caused this to loose focus so that
    // it can be passed to the delegate
    this._origEvent = evt;

    // should have been covered by willRemoveFromParent, but this was needed
    // too.
    this._scitf_blurInput();
    return this.blurEditor(evt) ;
  },

  /**
    invoked when the user presses escape.  Returns true to ignore keystroke

    @returns {Boolean}
  */
  cancel: function() {
    this.discardEditing();
    return YES;
  },

  // Invoked when the user presses return.  If this is a multi-line field,
  // then allow the new line to proceed by calling the super class.
  // Otherwise, try to commit the edit.
  /** @private */
  insertNewline: function(evt) {
    if (this.get('isTextArea')) {
      return arguments.callee.base.apply(this,arguments);
    } else {
      this.commitEditing() ;
      return YES ;
    }
  },

  // Tries to find the next key view when tabbing.  If the next view is
  // editable, begins editing.
  /** @private */
  insertTab: function(evt) {
    var target = this.target; // removed by commitEditing()
    this.resignFirstResponder();
    this.commitEditing() ;
    if(target){
      var next = target.get('nextValidKeyView');
      if(next && next.beginEditing) next.beginEditing();
    }
    return YES ;
  },

  /** @private */
  insertBacktab: function(evt) {
    var target = this.target; // removed by commitEditing()
    this.resignFirstResponder();
    this.commitEditing() ;
    if(target){
      var prev = target.get('previousValidKeyView');
      if(prev && prev.beginEditing) prev.beginEditing();
    }
    return YES ;
  }
});

/* >>>>>>>>>> BEGIN source/views/label.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('mixins/inline_editable');
sc_require('mixins/inline_editor_delegate');
sc_require('delegates/inline_text_field');


/**
  @class

  Displays a static string of text.

  You use a label view anytime you need to display a static string of text
  or to display text that may need to be edited using only an inline control.

  @extends SC.View
  @extends SC.Control
  @extends SC.InlineEditable
  @extends SC.InlineEditorDelegate
  @since SproutCore 1.0
*/
SC.LabelView = SC.View.extend(SC.Control, SC.InlineEditable,
/** @scope SC.LabelView.prototype */ {

  classNames: ['sc-label-view'],

  displayProperties: ['displayTitle', 'displayHint', 'displayToolTip', 'icon'],

  /**
    The delegate that gets notified of events related to the editing process. Set
    this to the object you want to handles the lifecycle of the inline editor.

    Defaults to itself.
    @type SC.Object
  */
  inlineEditorDelegate: SC.InlineTextFieldDelegate,

  isEditable: NO,

  /**
    The exampleInlineTextFieldView property is by default a
    SC.InlineTextFieldView but it can be set to a customized inline text field
    view.

    @property
    @type {SC.View}
    @default {SC.InlineTextFieldView}
  */
  exampleEditor: SC.InlineTextFieldView,

  /**
    Whether the value, hint and toolTip will be escaped to avoid HTML injection
    attacks or not.

    You should only disable this option if you are sure you are displaying
    non-user generated text.

    Note: this is not an observed display property.  If you change it after
    rendering, you should call `displayDidChange` on the view to update the layer.

    @type Boolean
    @default true
  */
  escapeHTML: true,

  /**
    If true, then the value will be localized.
    This is a default that can be overidden by the settings in the owner view.
  */
  localize: NO,
  localizeBindingDefault: SC.Binding.oneWay().bool(),

  /**
    If set to true, the label element will include the 'ellipsis' class, which
    by default sets the 'white-space' style to 'nowrap' and the 'text-overflow'
    style to 'ellipsis'.

    Note: that this does NOT work with multi-line text.

    Note: this is not an observed display property.  If you change it after
    rendering, you should call `displayDidChange` on the view to update the layer.

    @type Boolean
    @default false
   */
  needsEllipsis: false,

  /**
    Set this to a validator or to a function and the value
    will be passed through it before being set.

    This is a default default that can be overidden by the
    settings in the owner view.
  */
  formatter: null,

  /**
    The value of the label.

    You may also set the value using a content object and a contentValueKey.

    @field {String}
  */
  value: '',

  /**
    The hint to display if no value is set.  Should be used only if isEditable
    is set to YES.
  */
  hint: null,

  /** @deprecated */
  hintEnabled: function() {
    
    SC.warn("Developer Warning: The hintEnabled property of SC.LabelView is deprecated.  Please simply get the isEditable property to determine if the hint will be displayed instead.");
    
    return this.get('isEditable');
  }.property('isEditable').cacheable(),

  /**
    An optional icon to display to the left of the label.  Set this value
    to either a CSS class name (for spriting) or an image URL.
  */
  icon: null,

  /**
    Set the alignment of the label view.

    Note: this is not an observed display property.  If you change it after
    rendering, you should call `displayDidChange` on the view to update the layer.

    @type String SC.ALIGN_LEFT|SC.ALIGN_CENTER|SC.ALIGN_RIGHT
    @default null
    @deprecated Use CSS instead.
  */
  textAlign: null,

  //
  // SUPPORT FOR AUTOMATIC RESIZING
  //
  supportsAutoResize: YES,
  autoResizeLayer: function() { return this.get('layer'); }
  .property('layer').cacheable(),

  autoResizeText: function() { return this.get('displayTitle'); }
  .property('displayTitle').cacheable(),

  autoResizePadding: SC.propertyFromRenderDelegate('autoResizePadding', 10),

  /**
    The name of the theme's SC.LabelView render delegate.

    @type String
  */
  renderDelegateName: 'labelRenderDelegate',

  /**
    The value that will actually be displayed.

    This property is dynamically computed by applying localization,
    string conversion and other normalization utilities.

    @type String
  */
  displayTitle: function() {
    var value, formatter;

    value = this.get('value') ;

    // 1. apply the formatter
    formatter = this.getDelegateProperty('formatter', this.displayDelegate) ;
    if (formatter) {
      var formattedValue = (SC.typeOf(formatter) === SC.T_FUNCTION) ?
          formatter(value, this) : formatter.fieldValueForObject(value, this) ;
      if (!SC.none(formattedValue)) value = formattedValue ;
    }

    // 2. If the returned value is an array, convert items to strings and
    // join with commas.
    if (SC.typeOf(value) === SC.T_ARRAY) {
      var ary = [];
      for(var idx=0, idxLen = value.get('length'); idx< idxLen;idx++) {
        var x = value.objectAt(idx) ;
        if (!SC.none(x) && x.toString) x = x.toString() ;
        ary.push(x) ;
      }
      value = ary.join(',') ;
    }

    // 3. If value is not a string, convert to string. (handles 0)
    if (!SC.none(value) && value.toString) value = value.toString() ;

    // 4. Localize
    if (value && this.getDelegateProperty('localize', this.displayDelegate)) value = SC.String.loc(value) ;

    return value;
  }.property('value', 'localize', 'formatter').cacheable(),

  /**
    The hint that will actually be displayed depending on localization and
    sanitizing (or not).

    @type String
  */
  displayHint: function () {
    var hint = this.get('hint'),
      isEditable = this.get('isEditable');

    if (isEditable) {
      if (hint && this.getDelegateProperty('localize', this.displayDelegate)) {
        hint = SC.String.loc(hint);
      }
    } else {
      hint = null;
    }

    return hint;
  }.property('hint', 'localize', 'isEditable').cacheable(),

  /** @deprecated */
  hintValue: function() {
    
    SC.warn("Developer Warning: The hintValue property of SC.LabelView is deprecated.  Please simply get the hint or displayHint (localized) property instead.");
    
    var hintVal = this.get('hint');
    return hintVal;
  }.property('hint').cacheable(),

  /** @private */
  mouseDown: function(evt) {
    // Capture the event if it's a double click and we are editable.
    return this.get('isEditable') && evt.clickCount === 2;
  },

  /** @private If isEditable is set to true, opens the inline text editor view. */
  doubleClick: function (evt) { return this.beginEditing(); },

  /*
  * @method
  *
  * Hide the label view while the inline editor covers it.
  */
  inlineEditorDidBeginEditing: function(original, editor, value, editable) {
    this._oldOpacity = this.get('layout').opacity || 1;
    this.adjust('opacity', 0);

    original(editor, value, editable);
  }.enhance(),

  /*
  * @method
  *
  * Restore the label view when the inline editor finishes.
  */
  inlineEditorDidEndEditing: function() {
    this.adjust('opacity', this._oldOpacity);
    this._oldOpacity = null ;
  }
});

