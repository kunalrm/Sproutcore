/* >>>>>>>>>> BEGIN source/core.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


/**
  If set to `NO`, then pressing backspace will NOT navigate to the previous
  page in the browser history, which is the default behavior in most browsers.
  
  Usually it is best to leave this property set to `NO` in order to prevent the
  user from inadvertently losing data by pressing the backspace key.

  @static
  @type Boolean
  @default NO
*/
SC.allowsBackspaceToPreviousPage = NO;

/**
  @type String
  @static
  @constant
*/
SC.HORIZONTAL_ORIENTATION = 'horizontal';

/**
  @type String
  @static
  @constant
*/
SC.VERTICAL_ORIENTATION = 'vertical' ;

/* >>>>>>>>>> BEGIN source/system/drag.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


/**
  @static
*/
SC.DRAG_LINK = 0x0004;

/**
  @static
*/
SC.DRAG_COPY = 0x0001;

/**
  @static
*/
SC.DRAG_MOVE = 0x0002;

/**
  @static
*/
SC.DRAG_NONE = 0x0000;

/**
  @static
*/
SC.DRAG_ANY = 0x000F;

/**
  @static
*/
SC.DRAG_DATA = 0x0008; // includes SC.DRAG_REORDER

/**
  @static
*/
SC.DRAG_AUTOSCROLL_ZONE_THICKNESS = 20;

SC.View.reopen(
  /** @scope SC.View.prototype */ {

  /** @private */
  init: function (original) {
    original();

    // register for drags
    if (this.get('isDropTarget')) { SC.Drag.addDropTarget(this); }

    // register scroll views for autoscroll during drags
    if (this.get('isScrollable')) { SC.Drag.addScrollableView(this); }
  }.enhance(),

  /** @private */
  destroy: function (original) {
    // unregister for drags
    if (this.get('isDropTarget')) { SC.Drag.removeDropTarget(this); }

    // unregister for autoscroll during drags
    if (this.get('isScrollable')) { SC.Drag.removeScrollableView(this); }

    return original();
  }.enhance()
});

/**
  @class

  An instance of this object is created whenever a drag occurs.  The instance
  manages the mouse/touch events and coordinating with droppable targets until the
  user releases the mouse button.

  To initiate a drag, you should call `SC.Drag.start()` with the options below
  specified in a hash. Pass the ones you need to get the drag you want:

    - `event` -- *(req)* The mouse event/touch that triggered the drag.  This will be used
      to position the element.

    - `source` -- *(req)* The drag source object that should be consulted during
      the drag operations. This is usually the container view that initiated
      the drag.

    - `dragView` -- Optional view that will be used as the source image for the
      drag. The drag operation will clone the DOM elements for this view and
      parent them under the drag pane, which has the class name `sc-ghost-view`.
      The drag view is not moved from its original location during a drag.
      If the dragView is not provided, the source is used as dragView.

    - `ghost` -- `YES` | `NO`  If `NO`, the drag view image will show, but the source
      `dragView` will not be hidden.  Set to `YES` to make it appear that the
      `dragView` itself is being dragged around.

    - `slideBack` -- `YES` | `NO`  If `YES` and the drag operation is cancelled, the
      `dragView` will slide back to its source origin.

    - `origin` --  If passed, this will be used as the origin point for the
      ghostView when it slides back.  You normally do not need to pass this
      unless the ghost view does not appear in the main UI.

    - `data` -- Optional hash of data types and values.  You can use this to pass
      a static set of data instead of providing a dataSource.  If you provide
      a dataSource, it will be used instead.

    - `dataSource` --  Optional object that will provide the data for the drag to
      be consumed by the drop target.  If you do not pass this parameter or the
      data hash, then the source object will be used if it implements the
      SC.DragDataSource protocol.

    - `anchorView` -- if you pass this optional view, then the drag will only be
      allowed to happen within this view.  The ghostView will actually be added
      as a child of this view during the drag.  Normally the anchorView is the
      window.

  @extends SC.Object
*/
SC.Drag = SC.Object.extend(
/** @scope SC.Drag.prototype */ {

  /**
    The source object used to coordinate this drag.

    @readOnly
    @type SC.DragSource
  */
  source: null,

  /**
    The view actually dragged around the screen. This is created automatically
    from the dragView.

    @readOnly
    @type SC.View
  */
  ghostView: null,

  /**
    If `YES`, then the `ghostView` will acts like a cursor and attach directly
    to the mouse/touch location.

    @readOnly
    @type Boolean
  */
  ghostActsLikeCursor: NO,

  /**
    The view that was used as the source of the `ghostView`.

    The drag view is not moved from its original location during a drag.
    Instead, the DOM content of the view is cloned and managed by the
    ghostView.  If you want to visually indicate that the view is being
    moved, you should set ghost to `YES`.
    If dragView is not provided the source is used instead.

    @readOnly
    @type SC.View
  */
  dragView: null,

  /**
    If `YES`, the `dragView` is automatically hidden while dragging around the
    ghost.

    @readOnly
    @type Boolean
  */
  ghost: YES,

  /**
    If `NO`, the source will not be copied, clone, no ghost view will get created,
    and it won't be moved.

    @type Boolean
  */
  sourceIsDraggable: YES,

  /**
    If `YES`, then the `ghostView` will slide back to its original location if
    drag is cancelled.

    @type Boolean
  */
  slideBack: YES,

  /**
    The origin to slide back to in the coordinate of the `dragView`'s
    containerView.

    @type Point
  */
  ghostOffset: { x: 0, y: 0 },

  /**
    The current location of the mouse pointer in window coordinates. This is
    updated as long as the mouse button is pressed or touch is active. Drop targets are
    encouraged to update this property in their `dragUpdated()` method
    implementations.

    The ghostView will be positioned at this location.

    @type Point
  */
  location: {},

  // ..........................................
  // DRAG DATA
  //

  /**
    Data types supported by this drag operation.

    Returns an array of data types supported by the drag source.  This may be
    generated dynamically depending on the data source.

    If you are implementing a drag source, you will need to provide these data
    types so that drop targets can detect if they can accept your drag data.

    If you are implementing a drop target, you should inspect this property
    on your `dragEntered()` and `prepareForDragOperation()` methods to determine
    if you can handle any of the data types offered up by the drag source.

    @type Array
  */
  dataTypes: function () {
    // first try to use the data source.
    if (this.dataSource) return this.dataSource.get('dragDataTypes') || [];

    // if that fails, get the keys from the data hash.
    var hash = this.data;
    if (hash) {
      var ret = [];
      for (var key in hash) {
        if (hash.hasOwnProperty(key)) ret.push(key);
      }
      return ret;
    }

    // if that fails, then check to see if the source object is a dataSource.
    var source = this.get('source');
    if (source && source.dragDataTypes) return source.get('dragDataTypes') || [];

    // no data types found. :(
    return [];
  }.property().cacheable(),

  /**
    Checks for a named data type in the drag.

    @param {String} dataType the data type
    @returns {Boolean} YES if data type is present in dataTypes array.
  */
  hasDataType: function (dataType) {
    return (this.get('dataTypes').indexOf(dataType) >= 0);
  },

  /**
    Retrieve the data for the specified `dataType` from the drag source.

    Drop targets can use this method during their `performDragOperation()`
    method to retrieve the actual data provided by the drag data source.  This
    data may be generated dynamically depending on the data source.

    @param {Object} dataType data type you want to retrieve.  Should be one of
      the values returned in the dataTypes property
    @returns {Object} The generated data.
  */
  dataForType: function (dataType) {
    // first try to use the data Source.
    if (this.dataSource) {
      return this.dataSource.dragDataForType(this, dataType);

    // then try to use the data hash.
    } else if (this.data) {
      return this.data[dataType];

    // if all else fails, check to see if the source object is a data source.
    } else {
      var source = this.get('source');
      if (source && SC.typeOf(source.dragDataForType) === SC.T_FUNCTION) {
        return source.dragDataForType(this, dataType);

      // no data source found. :(
      } else return null;
    }
  },

  /**
    Optional object used to provide the data for the drag.

    Drag source can designate a `dataSource` object to generate the data for
    a drag dynamically.  The data source can and often is the drag source
    object itself.

    Data Source objects must comply with the `SC.DragDataSource` interface.  If
    you do not want to implement this interface, you can provide the data
    directly with the data property.

    If you are implementing a drop target, use the dataTypes property and
    `dataForTypes()` method to access data instead of working directly with
    these properties.

    @readOnly
    @type SC.DragDataSource
  */
  dataSource: null,

  /**
    Optional hash of data.  Used if no dataSource was provided.

    Drag sources can provide a hash of data when the drag begins instead of
    specifying an actual dataSource.  The data is stored in this property.
    If you are implementing a drop target, use the dataTypes property and
    `dataForTypes()` method to access data instead of working directly with
    these properties.

    @readOnly
    @type Hash
  */
  data: null,

  /**
    Returns the currently allowed `dragOperations` for the drag.  This will be
    set just before any callbacks are invoked on a drop target.  The drag
    source is given an opportunity to set these operations.

    @readOnly
    @type Number
  */
  allowedDragOperations: SC.DRAG_ANY,

  /** @private required by autoscroll */
  _dragInProgress: YES,

  /** @private
    Stores the initial visibility state of the dragView so it can be restored
    after the drag
  */
  _dragViewWasVisible: null,

  /** @private
    This will actually start the drag process. Called by SC.Drag.start().
  */
  startDrag: function () {
    if (this.get('sourceIsDraggable')) {
      // create the ghost view
      this._createGhostView();
    }

    var evt = this.event;

    // compute the ghost offset from the original start location

    var loc = { x: evt.pageX, y: evt.pageY };
    this.set('location', loc);

    if (this.get('sourceIsDraggable')) {
      var dv = this._getDragView();
      var pv = dv.get('parentView');

      // convert to global coordinates
      var origin = pv ? pv.convertFrameToView(dv.get('frame'), null) : dv.get('frame');

      if (this.get('ghost')) {
        // Hide the dragView
        this._dragViewWasVisible = dv.get('isVisible');
        dv.set('isVisible', NO);
      }

      if (this.ghostActsLikeCursor) this.ghostOffset = { x: 14, y: 14 };
      else this.ghostOffset = { x: (loc.x - origin.x), y: (loc.y - origin.y) };

      // position the ghost view
      if (!this._ghostViewHidden) this._positionGhostView(evt);

      if (evt.makeTouchResponder) {
        // Should use invokeLater if I can figure it out
        var self = this;
        SC.Timer.schedule({
          target: evt,
          action: function () {
            if (!evt.hasEnded) evt.makeTouchResponder(self, YES);
          },
          interval: 1
        });
      }
      else {
        // notify root responder that a drag is in process
        this.ghostView.rootResponder.dragDidStart(this, evt);
      }
    }

    var source = this.source;
    if (source && source.dragDidBegin) source.dragDidBegin(this, loc);

    // let all drop targets know that a drag has started
    var ary = this._dropTargets();

    for (var idx = 0, len = ary.length; idx < len; idx++) {
      ary[idx].tryToPerform('dragStarted', this, evt);
    }
  },

  /** @private
    Cancel the drag operation.

    This is called by RootResponder's keyup method when the user presses
    escape and a drag is in progress.

    @param {Event} evt the key event
    @see SC.Drag.endDrag
  */
  cancelDrag: function (evt) {
    var target = this._lastTarget,
        loc = this.get('location');

    if (target && target.dragExited) target.dragExited(this, this._lastMouseDraggedEvent);

    this.endDrag(evt, SC.DRAG_NONE);
  },

  /** @private
    End the drag operation.

    This notifies the data source that the drag ended and removes the
    ghost view, but does not notify the drop target of a drop.

    @param {Event} evt
    @param {DragOp} op The drag operation that was performed. One of
      SC.DRAG_COPY, SC.DRAG_MOVE, SC.DRAG_LINK, or SC.DRAG_NONE.
  */
  endDrag: function (evt, op) {
    var loc = this.get('location');

    // notify all drop targets that the drag ended
    var ary = this._dropTargets();
    for (var idx = 0, len = ary.length; idx < len; idx++) {
      try {
        ary[idx].tryToPerform('dragEnded', this, evt);
      } catch (ex2) {
        SC.Logger.error('Exception in SC.Drag.mouseUp(dragEnded on %@): %@'.fmt(ary[idx], ex2));
      }
    }

    if (this.get('sourceIsDraggable')) {
      // destroy the ghost view
      this._destroyGhostView();

      if (this.get('ghost')) {
        // Show the dragView if it was hidden.
        if (this._dragViewWasVisible) this._getDragView().set('isVisible', YES);
        this._dragViewWasVisible = null;
      }
    }

    // notify the source that everything has completed
    var source = this.source;
    if (source && source.dragDidEnd) source.dragDidEnd(this, loc, op);
    
    this._cleanUpDrag();
  },

  // ..........................................
  // PRIVATE PROPERTIES AND METHODS
  //

  /** @private */
  touchStart: function (evt) {
    return YES;
  },

  /** @private
    This method is called repeatedly during a mouse drag.  It updates the
    position of the ghost image, then it looks for a current drop target and
    notifies it.
  */
  mouseDragged: function (evt) {
    var scrolled = this._autoscroll(evt);
    var loc = this.get('location');
    if (!scrolled && (evt.pageX === loc.x) && (evt.pageY === loc.y)) {
      return; // quickly ignore duplicate calls
    }

    // save the new location to avoid duplicate mouseDragged event processing
    loc = { x: evt.pageX, y: evt.pageY };
    this.set('location', loc);
    this._lastMouseDraggedEvent = evt;

    // STEP 1: Determine the deepest drop target that allows an operation.
    // if the drop target selected the last time this method was called
    // differs from the deepest target found, then go up the chain until we
    // either hit the last one or find one that will allow a drag operation
    var source = this.source;
    var last = this._lastTarget;
    var target = this._findDropTarget(evt); // deepest drop target
    var op = SC.DRAG_NONE;

    while (target && (target !== last) && (op === SC.DRAG_NONE)) {
      // make sure the drag source will permit a drop operation on the named
      // target
      if (target && source && source.dragSourceOperationMaskFor) {
        op = source.dragSourceOperationMaskFor(this, target);
      } else op = SC.DRAG_ANY; // assume drops are allowed

      // now, let's see if the target will accept the drag
      if ((op !== SC.DRAG_NONE) && target && target.computeDragOperations) {
        op = op & target.computeDragOperations(this, evt, op);
      } else op = SC.DRAG_NONE; // assume drops AREN'T allowed

      this.allowedDragOperations = op;

      // if DRAG_NONE, then look for the next parent that is a drop zone
      if (op === SC.DRAG_NONE) target = this._findNextDropTarget(target);
    }

    // STEP 2: Refocus the drop target if needed
    if (target !== last) {
      if (last && last.dragExited) last.dragExited(this, evt);

      if (target) {
        if (target.dragEntered) target.dragEntered(this, evt);
        if (target.dragUpdated) target.dragUpdated(this, evt);
      }

      this._lastTarget = target;
    } else {
      if (target && target.dragUpdated) target.dragUpdated(this, evt);
    }

    // notify source that the drag moved
    if (source && source.dragDidMove) source.dragDidMove(this, loc);

    // reposition the ghostView
    if (this.get('sourceIsDraggable') && !this._ghostViewHidden) this._positionGhostView(evt);
  },

  touchesDragged: function (evt) {
    this.mouseDragged(evt);
  },

  /**
    @private

    Called when the mouse is released.  Performs any necessary cleanup and
    executes the drop target protocol to try to complete the drag operation.
  */
  mouseUp: function (evt) {
    var loc    = { x: evt.pageX, y: evt.pageY },
        target = this._lastTarget,
        op     = this.allowedDragOperations;

    this.set('location', loc);

    // try to have the drop target perform the drop...
    try {
      if (target && target.acceptDragOperation && target.acceptDragOperation(this, op)) {
        op = target.performDragOperation ? target.performDragOperation(this, op) : SC.DRAG_NONE;
      } else {
        op = SC.DRAG_NONE;
      }
    } catch (e) {
      SC.Logger.error('Exception in SC.Drag.mouseUp(acceptDragOperation|performDragOperation): %@'.fmt(e));
    }

    this.endDrag(evt, op);
  },

  /** @private */
  touchEnd: function (evt) {
    this.mouseUp(evt);
  },

  /** @private
    Returns the dragView. If it is not set, the source is returned.
  */
  _getDragView: function () {
    if (!this.dragView) {
      if (!this.source || !this.source.isView) throw new Error("Source can't be used as dragView, because it's not a view.");
      this.dragView = this.source;
    }
    return this.dragView;
  },

  /** @private
    This will create the ghostView and add it to the document.
  */
  _createGhostView: function () {
    var that  = this,
        dragView = this._getDragView(),
        frame = dragView.get('borderFrame'),
        layout = dragView.get('layout'),
        ghostLayout, view;

    // Create a fixed layout for the ghost view.
    ghostLayout = { top: frame.y, left: frame.x, width: frame.width, height: frame.height };

    view = this.ghostView = SC.Pane.create({
      classNames: ['sc-ghost-view'],
      layout: ghostLayout,
      owner: this,
      wantsAcceleratedLayer: dragView.get('wantsAcceleratedLayer'),

      didCreateLayer: function () {
        if (dragView) {
          var layer = dragView.get('layer');
          if (layer) {
            layer = layer.cloneNode(true);

            // Make sure the layer we put in the ghostView wrapper is not displaced.
            layer.style.top = "0px";
            layer.style.left = "0px";
            layer.style.bottom = "0px";
            layer.style.right = "0px";
            this.get('layer').appendChild(layer);
          }
        }
      }
    });

    view.append();  // add to window
  },

  /** @private
    Positions the ghost view underneath the mouse/touch with the initial offset
    recorded by when the drag started.
  */
  _positionGhostView: function (evt) {
    var ghostView = this.ghostView,
      loc;

    if (ghostView) {
      loc = this.get('location');

      loc.x -= this.ghostOffset.x;
      loc.y -= this.ghostOffset.y;
      ghostView.adjust({ top: loc.y, left: loc.x });
    }
  },

  /** @private
    YES if the ghostView has been manually hidden.

    @type Boolean
    @default NO
  */
  _ghostViewHidden: NO,

  /**
    Hide the ghostView.
  */
  hideGhostView: function () {
    if (this.ghostView && !this._ghostViewHidden) {
      this.ghostView.remove();
      this._ghostViewHidden = YES;
    }
  },

  /**
    Unhide the ghostView.
  */
  unhideGhostView: function () {
    if (this._ghostViewHidden) {
      this._ghostViewHidden = NO;
      this._createGhostView();
    }
  },

  /** @private */
  _destroyGhostView: function () {
    if (this.ghostView) {
      this.ghostView.remove();
      this.ghostView = null; // this will allow the GC to collect it.
      this._ghostViewHidden = NO;
    }
  },

  /** @private */
  _cleanUpDrag: function() {
    this._lastTarget = null;
    this._dragInProgress = NO;
    this._cachedDropTargets = null;
  },
  
  /** @private
    Return an array of drop targets, sorted with any nested drop targets
    at the top of the array.  The first time this method is called during
    a drag, it will reconstruct this array using the current set of
    drop targets.  Afterwards it uses the cached set until the drop
    completes.

    This means that if you change the view hierarchy of your drop targets
    during a drag, it will probably be wrong.
  */
  _dropTargets: function () {
    if (this._cachedDropTargets) return this._cachedDropTargets;

    // build array of drop targets
    var ret = [];
    var hash = SC.Drag._dropTargets;
    for (var key in hash) {
      if (hash.hasOwnProperty(key)) ret.push(hash[key]);
    }

    // views must be sorted so that drop targets with the deepest nesting
    // levels appear first in the array.  The getDepthFor().
    var depth = {};
    var dropTargets = SC.Drag._dropTargets;
    var getDepthFor = function (x) {
      if (!x) return 0;
      var guid = SC.guidFor(x);
      var ret = depth[guid];
      if (!ret) {
        ret = 1;
        while (x = x.get('parentView')) {
          if (dropTargets[SC.guidFor(x)] !== undefined) ret = ret + 1;
          if (x.isPane && x.isMainPane) ret = ret + 10000; // Arbitrary value always have the main pain on top
        }
        depth[guid] = ret;
      }
      return ret;
    };

    // sort array of drop targets
    ret.sort(function (a, b) {
      if (a === b) return 0;
      a = getDepthFor(a);
      b = getDepthFor(b);
      return (a > b) ? -1 : 1;
    });

    this._cachedDropTargets = ret;
    return ret;
  },

  /** @private
    This will search through the drop targets, looking for one in the target
    area.
  */
  _findDropTarget: function (evt) {
    var loc = { x: evt.pageX, y: evt.pageY };

    var target, frame;
    var ary = this._dropTargets();
    for (var idx = 0, len = ary.length; idx < len; idx++) {
      target = ary[idx];

      // If the target is not visible, it is not valid.
      if (!target.get('isVisibleInWindow')) continue;

      // get clippingFrame, converted to the pane.
      frame = target.convertFrameToView(target.get('clippingFrame'), null);

      // check to see if loc is inside.  If so, then make this the drop target
      // unless there is a drop target and the current one is not deeper.
      if (SC.pointInRect(loc, frame)) return target;
    }
    return null;
  },

  /** @private
    Search the parent nodes of the target to find another view matching the
    drop target.  Returns null if no matching target is found.
  */
  _findNextDropTarget: function (target) {
    var dropTargets = SC.Drag._dropTargets;
    while (target = target.get('parentView')) {
      if (dropTargets[SC.guidFor(target)]) return target;
    }
    return null;
  },

  // ............................................
  // AUTOSCROLLING
  //

  /** @private
    Performs auto-scrolling for the drag.  This will only do anything if
    the user keeps the mouse/touch within a few pixels of one location for a little
    while.

    Returns YES if a scroll was performed.
  */
  _autoscroll: function (evt) {
    if (!evt) evt = this._lastAutoscrollEvent;

    // If drag has ended, exit
    if (!this._dragInProgress) return NO;

    // STEP 1: Find the first view that we can actually scroll.  This view
    // must be:
    // - scrollable
    // - the mouse pointer or touch must be within a scrolling hot zone
    // - there must be room left to scroll in that direction.

    // NOTE: an event is passed only when called from mouseDragged
    var loc  = evt ? { x: evt.pageX, y: evt.pageY } : this.get('location'),
        view = this._findScrollableView(loc),
        scrollableView = null, // become final view when found
        vscroll, hscroll, min, max, edge, container, f;

    // hscroll and vscroll will become either 1 or -1 to indicate scroll
    // direction or 0 for no scroll.

    while (view && !scrollableView) {

      // quick check...can we scroll this view right now?
      vscroll = view.get('canScrollVertical') ? 1 : 0;
      hscroll = view.get('canScrollHorizontal') ? 1 : 0;

      // at least one direction might be scrollable.  Collect frame info
      if (vscroll || hscroll) {
        container = view.get('containerView');
        if (container) {
          f = view.convertFrameToView(container.get('frame'), null);
        } else {
          vscroll = hscroll = 0; // can't autoscroll this mother
        }
      }

      // handle vertical direction
      if (vscroll) {

        // bottom hotzone?
        max = SC.maxY(f);
        min = max - SC.DRAG_AUTOSCROLL_ZONE_THICKNESS;
        if (loc.y >= min && loc.y <= max) vscroll = 1;
        else {
          // how about top
          min = SC.minY(f);
          max = min + SC.DRAG_AUTOSCROLL_ZONE_THICKNESS;
          if (loc.y >= min && loc.y <= max) vscroll = -1;
          else vscroll = 0; // can't scroll vertical
        }
      }

      // handle horizontal direction
      if (hscroll) {

        // bottom hotzone?
        max = SC.maxX(f);
        min = max - SC.DRAG_AUTOSCROLL_ZONE_THICKNESS;
        if (loc.x >= min && loc.x <= max) hscroll = 1;
        else {
          // how about top
          min = SC.minX(f);
          max = min + SC.DRAG_AUTOSCROLL_ZONE_THICKNESS;
          if (loc.x >= min && loc.x <= max) hscroll = -1;
          else hscroll = 0; // can't scroll vertical
        }
      }

      // if we can scroll, then set this.
      if (vscroll || hscroll) scrollableView = view;
      else view = this._findNextScrollableView(view);
    }

    // STEP 2: Only scroll if the user remains within the hot-zone for a
    // period of time
    if (scrollableView && (this._lastScrollableView === scrollableView)) {
      if ((Date.now() - this._hotzoneStartTime) > 100) {
        this._horizontalScrollAmount *= 1.05;
        this._verticalScrollAmount *= 1.05; // accelerate scroll
      }

    // otherwise, reset everything and disallow scroll
    } else {
      this._lastScrollableView = scrollableView;
      this._horizontalScrollAmount = 15;
      this._verticalScrollAmount = 15;
      this._hotzoneStartTime = (scrollableView) ? Date.now() : null;
      hscroll = vscroll = 0;
    }

    // STEP 3: Scroll!
    if (scrollableView && (hscroll || vscroll)) {
      var scroll = {
        x: hscroll * this._horizontalScrollAmount,
        y: vscroll * this._verticalScrollAmount
      };
      scrollableView.scrollBy(scroll);
    }

    // If a scrollable view was found, then check later
    if (scrollableView) {
      if (evt) {
        this._lastAutoscrollEvent = { pageX: evt.pageX, pageY: evt.pageY };
      }
      this.invokeLater(this._autoscroll, 100, null);
      return YES;
    } else {
      this._lastAutoscrollEvent = null;
      return NO;
    }
  },

  /** @private
    Returns an array of scrollable views, sorted with nested scrollable views
    at the top of the array.  The first time this method is called during a
    drag, it will reconstruct this array using the current state of scrollable
    views.  Afterwards it uses the cached set until the drop completes.
  */
  _scrollableViews: function () {
    if (this._cachedScrollableView) return this._cachedScrollableView;

    // build array of scrollable views
    var ret = [];
    var hash = SC.Drag._scrollableViews;
    for (var key in hash) {
      if (hash.hasOwnProperty(key)) ret.push(hash[key]);
    }

    // now resort.  This custom function will sort nested scrollable views
    // at the start of the list.
    ret = ret.sort(function (a, b) {
      var view = a;
      while (view = view.get('parentView')) {
        if (b === view) return -1;
      }
      return 1;
    });

    this._cachedScrollableView = ret;
    return ret;
  },

  /** @private
    This will search through the scrollable views, looking for one in the
    target area.
  */
  _findScrollableView: function (loc) {
    var ary = this._scrollableViews(),
        len = ary ? ary.length : 0,
        target, frame, idx;

    for (idx = 0; idx < len; idx++) {
      target = ary[idx];

      if (!target.get('isVisibleInWindow')) continue;

      // get clippingFrame, converted to the pane
      frame = target.convertFrameToView(target.get('clippingFrame'), null);

      // check to see if loc is inside
      if (SC.pointInRect(loc, frame)) return target;
    }
    return null;
  },

  /** @private
    Search the parent nodes of the target to find another scrollable view.
    return null if none is found.
  */
  _findNextScrollableView: function (view) {
    var scrollableViews = SC.Drag._scrollableViews;
    while (view = view.get('parentView')) {
      if (scrollableViews[SC.guidFor(view)]) return view;
    }
    return null;
  }

});

SC.Drag.mixin(
/** @scope SC.Drag */ {

  /**
   This is the method you use to initiate a new drag.  See class documentation
   for more info on the options taken by this method.

   @params {Hash} ops a hash of options.  See documentation above.
  */
  start: function (ops) {
    var ret = this.create(ops);
    ret.startDrag();
    return ret;
  },

  /** @private */
  _dropTargets: {},

  /** @private */
  _scrollableViews: {},

  /**
    Register the view object as a drop target.

    This method is called automatically whenever a view is created with the
    isDropTarget property set to `YES`.  You generally will not need to call it
    yourself.

    @param {SC.View} target a view implementing the SC.DropTarget protocol
  */
  addDropTarget: function (target) {
    this._dropTargets[SC.guidFor(target)] = target;
  },

  /**
    Unregister the view object as a drop target.

    This method is called automatically whenever a view is removed from the
    hierarchy.  You generally will not need to call it yourself.

    @param {SC.View} target A previously registered drop target
  */
  removeDropTarget: function (target) {
    delete this._dropTargets[SC.guidFor(target)];
  },

  /**
    Register the view object as a scrollable view.  These views will
    auto-scroll during a drag.

    @param {SC.View} target The view that should be auto-scrolled
  */
  addScrollableView: function (target) {
    this._scrollableViews[SC.guidFor(target)] = target;
  },

  /**
    Remove the view object as a scrollable view.  These views will auto-scroll
    during a drag.

    @param {SC.View} target A previously registered scrollable view
  */
  removeScrollableView: function (target) {
    delete this._scrollableViews[SC.guidFor(target)];
  }

});

/* >>>>>>>>>> BEGIN source/debug/drag.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('system/drag') ;

SC.Drag.mixin(
/** @scope SC.Drag */ {
   
  /**
    Convenience method to turn an operation mask into a descriptive string.
  */
  inspectOperation: function(op) {
    var ret = [] ;
    if (op === SC.DRAG_NONE) {
      ret = ['DRAG_NONE'];
    } else if (op === SC.DRAG_ANY) {
      ret = ['DRAG_ANY'] ;
    } else {
      if (op & SC.DRAG_LINK) {
        ret.push('DRAG_LINK') ;
      }
      
      if (op & SC.DRAG_COPY) {
        ret.push('DRAG_COPY') ;
      }
      
      if (op & SC.DRAG_MOVE) {
        ret.push('DRAG_MOVE') ;
      }
      
      if (op & SC.DRAG_REORDER) {
        ret.push('DRAG_REORDER') ;
      }
    }
    return ret.join('|') ;
  }

});

/* >>>>>>>>>> BEGIN source/mixins/collection_fast_path.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/** @deprecated

  An experimental `CollectionView` mixin that makes it extremely fast under
  certain circumstances, including for mobile devices.
*/
SC.CollectionFastPath = {

  //
  // ITEM VIEW CLASS/INSTANCE MANAGEMENT
  //
  initMixin: function() {
    this._indexMap = {};
    this._viewMap = {};
  },

  /**
    Returns the pool for a given example view.

    The pool is calculated based on the guid for the example view class.

    @param {SC.View} exampleView
  */
  poolForExampleView: function(exampleView) {
    var poolKey = "_pool_" + SC.guidFor(exampleView);
    if (!this[poolKey]) this[poolKey] = [];
    return this[poolKey];
  },

  /**
    Creates an item view from a given example view, configuring it with basic settings
    and the supplied attributes.

    @param {SC.View} exampleView
    @param {Hash} attrs
  */
  createItemViewFromExampleView: function(exampleView, attrs) {
    // create the example view
    var ret = this.createItemView(exampleView, null, attrs);

    // for our pooling, if it is poolable, mark the view as poolable and
    // give it a reference to its pool.
    if (ret.isPoolable) {
      ret.owningPool = this.poolForExampleView(exampleView);
    }

    // we will sometimes need to know what example view created the item view
    ret.createdFromExampleView = exampleView;

    // and now, return (duh)
    return ret;
  },

  /**
    @param {SC.View} itemView
    @param {Hash} attrs
  */
  configureItemView: function(itemView, attrs) {
    // set settings. Self explanatory.
    itemView.beginPropertyChanges();
    itemView.setIfChanged('content', attrs.content);
    itemView.setIfChanged('contentIndex', attrs.contentIndex);
    itemView.setIfChanged('parentView', attrs.parentView);
    itemView.setIfChanged('layerId', attrs.layerId);
    itemView.setIfChanged('isEnabled', attrs.isEnabled);
    itemView.setIfChanged('isSelected', attrs.isSelected);
    itemView.setIfChanged('outlineLevel', attrs.outlineLevel);
    itemView.setIfChanged('layout', attrs.layout);
    itemView.setIfChanged('disclosureState', attrs.disclosureState);
    itemView.setIfChanged('isVisibleInWindow', attrs.isVisibleInWindow);
    itemView.setIfChanged('isGroupView', attrs.isGroupView);
    itemView.setIfChanged('page', this.page);
    itemView.endPropertyChanges();
  },

  /**
    Configures a pooled view, calling `.awakeFromPool` if it is defined.

    @param {SC.View} itemView
    @param {Hash} attrs
  */
  wakePooledView: function(itemView, attrs) {
    // configure
    this.configureItemView(itemView, attrs);

    // awake from the pool, etc.
    if (itemView.awakeFromPool) itemView.awakeFromPool(itemView.owningPool, this);
  },

  /**
    Gets an item view from an example view, from a pool if possible, and otherwise
    by generating it.

    @param {SC.View} exampleView
    @param {Hash} attrs
  */
  allocateItemView: function(exampleView, attrs) {
    // we will try to get it from a pool. This will fill ret. If ret is not
    // filled, then we'll know to generate one.
    var ret;

    // if it is poolable, we just grab from the pool.
    if (exampleView.prototype.isPoolable) {
      var pool = this.poolForExampleView(exampleView);
      if (pool.length > 0) {
        ret = pool.pop();
        this.wakePooledView(ret, attrs);
      }
    }

    if (!ret) {
      ret = this.createItemViewFromExampleView(exampleView, attrs);
    }

    return ret;
  },

  /**
    Releases an item view. If the item view is pooled, it puts it into the pool;
    otherwise, this calls `.destroy()`.

    This is called for one of two purposes: to release a view that is no longer displaying,
    or to release an older cached version of a view that needed to be replaced because the
    example view changed.

    @param {SC.View} itemView
  */
  releaseItemView: function(itemView) {
    // if it is not poolable, there is not much we can do.
    if (!itemView.isPoolable) {
      itemView.destroy();
      return;
    }

    // otherwise, we need to return to view
    var pool = itemView.owningPool;
    pool.push(itemView);
    if (itemView.hibernateInPool) itemView.hibernateInPool(pool, this);
  },

  /** @private
    Returns YES if the item at the index is a group.
  */
  contentIndexIsGroup: function(view, content, index) {
    var contentDelegate = this.get("contentDelegate");

    // setup our properties
    var groupIndexes = this.get('_contentGroupIndexes'), isGroupView = NO;

    // and do our checking
    isGroupView = groupIndexes && groupIndexes.contains(index);
    if (isGroupView) isGroupView = contentDelegate.contentIndexIsGroup(this, this.get("content"), index);

    // and return
    return isGroupView;
  },

  /** @private
    Determines the example view for a content index. There are two optional parameters that will
    speed things up: `contentObject` and `isGroupView`. If you don't supply them, they must be computed.
  */
  exampleViewForItem: function(item, index) {
    var del = this.get('contentDelegate'),
        groupIndexes = this.get('_contentGroupIndexes'),
        key, ExampleView,
        isGroupView = this.contentIndexIsGroup(this, this.get('content'), index);

    if (isGroupView) {
      // so, if it is indeed a group view, we go that route to get the example view
      key = this.get('contentGroupExampleViewKey');
      if (key && item) ExampleView = item.get(key);
      if (!ExampleView) ExampleView = this.get('groupExampleView') || this.get('exampleView');
    } else {
      // otherwise, we go through the normal example view
      key = this.get('contentExampleViewKey');
      if (key && item) ExampleView = item.get(key);
      if (!ExampleView) ExampleView = this.get('exampleView');
    }

    return ExampleView;
  },

  /** @private
    This may seem somewhat awkward, but it is for memory performance: this fills in a hash
    YOU provide with the properties for the given content index.

    Properties include both the attributes given to the view and some `CollectionView` tracking
    properties, most importantly the exampleView.
  */
  setAttributesForItem: function(item, index, attrs) {
    var del = this.get('contentDelegate'),
        isGroupView = this.contentIndexIsGroup(this, this.get('content'), index),
        ExampleView = this.exampleViewForItem(item, index),
        content = this.get("content");

    //
    // FIGURE OUT "NORMAL" ATTRIBUTES
    //
    attrs.createdFromExampleView = ExampleView;
    attrs.parentView = this.get('containerView') || this;
    attrs.contentIndex = index;
    attrs.owner = attrs.displayDelegate = this;
    attrs.content = item;
    attrs.page = this.page;
    attrs.layerId = this.layerIdFor(index);
    attrs.isEnabled = del.contentIndexIsEnabled(this, content, index);
    attrs.isSelected = del.contentIndexIsSelected(this, content, index);
    attrs.outlineLevel = del.contentIndexOutlineLevel(this, content, index);
    attrs.disclosureState = del.contentIndexDisclosureState(this, content, index);
    attrs.isVisibleInWindow = this.get('isVisibleInWindow');
    attrs.isGroupView = isGroupView;
    attrs.layout = this.layoutForContentIndex(index);
    if (!attrs.layout) attrs.layout = ExampleView.prototype.layout;
  },

  //
  // ITEM LOADING/DOM MANAGEMENT
  //

  /** @private
    Returns mapped item views for the supplied item.
  */
  mappedViewsForItem: function(item, map) {
    if (!map) map = this._viewMap;
    return map[SC.guidFor(item)];
  },

  /** @private
    Returns the mapped view for an item at the specified index.
  */
  mappedViewForItem: function(item, idx, map) {
    if (!map) map = this._viewMap;
    var m = map[SC.guidFor(item)];
    if (!m) return undefined;
    return m[idx];
  },

  /** @private
    Maps a view to an item/index combination.
  */
  mapView: function(item, index, view, map) {
    // get the default view map if a map was not supplied
    if (!map) map = this._viewMap;

    // get the item map
    var g = SC.guidFor(item),
        imap = map[g];
    if (!imap) imap = map[g] = {_length: 0};

    // fill in the index
    imap[index] = view;
    imap._length++;
  },

  /** @private
    Unmaps a view from an item/index combination.
  */
  unmapView: function(item, index, map) {
    if (!map) map = this._viewMap;
    var g = SC.guidFor(item),
        imap = map[g];

    // return if there is nothing to do
    if (!imap) return;

    // remove
    if (imap[index]) {
      var v = imap[index];
      delete imap[index];

      imap._length--;
      if (imap._length <= 0) delete map[g];
    }
  },

  /**
    Returns the item view for the given content index.
    NOTE: THIS WILL ADD THE VIEW TO DOM TEMPORARILY (it will be cleaned if
          it is not used). As such, use sparingly.

    @param {Number} index
  */
  itemViewForContentIndex: function(index) {
    var content = this.get("content");
    if (!content) return;

    var item = content.objectAt(index);

    var exampleView = this.exampleViewForItem(item, index),
        view = this._indexMap[index];

    if (view && view.createdFromExampleView !== exampleView) {
      this.removeItemView(view);
      this.unmapView(item, index);
      view = null;
    }

    if (!view) {
      view = this.addItemView(exampleView, item, index);
    }

    return view;
  },

  /** @private
    Returns the nearest item view index to the supplied index mapped to the item.
  */
  nearestMappedViewIndexForItem: function(item, index, map) {
    var m = this.mappedViewsForItem(item, map);
    if (!m) return null;

    // keep track of nearest and the nearest distance
    var nearest = null, ndist = -1, dist = 0;

    // loop through
    for (var idx in m) {
      idx = parseInt(idx, 10);
      if (isNaN(idx)) continue;
      // get distance
      dist = Math.abs(index - idx);

      // compare to nearest distance
      if (ndist < 0 || dist < ndist) {
        ndist = dist;
        nearest = idx;
      }
    }

    return nearest;
  },

  /** @private
    Remaps the now showing views to their new indexes (if they have moved).
  */
  remapItemViews: function(nowShowing) {
    // reset the view map, but keep the old for removing
    var oldMap = this._viewMap,
        newMap = (this._viewMap = {}),
        indexMap = (this._indexMap = {}),
        mayExist = [],
        content = this.get("content"), item;

    if (!content) return;
    var itemsToAdd = this._itemsToAdd;

    // first, find items which we can (that already exist, etc.)
    nowShowing.forEach(function(idx) {
      item = content.objectAt(idx);

      // determine if we have view(s) in the old map for the item
      var possibleExistingViews = this.mappedViewsForItem(item, oldMap);
      if (possibleExistingViews) {

        // if it is the same index, we just take it. End of story.
        if (possibleExistingViews[idx]) {
          var v = possibleExistingViews[idx];
          this.unmapView(item, idx, oldMap);
          this.mapView(item, idx, v, newMap);
          indexMap[idx] = v;
        } else {
          // otherwise, we must investigate later
          mayExist.push(idx);
        }
      } else {
        // if it is in now showing but we didn't find a view, it needs to be created.
        itemsToAdd.push(idx);
      }
    }, this);

    // now there are also some items which _could_ exist (but might not!)
    for (var idx = 0, len = mayExist.length; idx < len; idx++) {
      var newIdx = mayExist[idx];
      item = content.objectAt(newIdx);
      var nearestOldIndex = this.nearestMappedViewIndexForItem(item, newIdx, oldMap),
          nearestView;

      if (!SC.none(nearestOldIndex)) {
        nearestView = this.mappedViewForItem(item, nearestOldIndex, oldMap);
        var newExampleView = this.exampleViewForItem(item, newIdx);
        if (newExampleView === nearestView.createdFromExampleView) {
          // if there is a near one, use it, and remove it from the map
          this.unmapView(item, nearestOldIndex, oldMap);
          this.mapView(item, newIdx, nearestView, newMap);
          indexMap[newIdx] = nearestView;
        } else {
          itemsToAdd.push(newIdx);
        }
      } else {
        // otherwise, we need to create it.
        itemsToAdd.push(newIdx);
      }
    }

    return oldMap;
  },

  /**
    Reloads.

    @param {SC.IndexSet} nowShowing
    @param {Boolean} scrollOnly
  */
  reloadIfNeeded: function(nowShowing, scrollOnly) {
    var content = this.get("content"), invalid;

    // we use the nowShowing to determine what should and should not be showing.
    if (!nowShowing || !nowShowing.isIndexSet) nowShowing = this.get('nowShowing');

    // we only update if this is a non-scrolling update.
    // don't worry: we'll actually update after the fact, and the invalid indexes should
    // be queued up nicely.
    if (!scrollOnly) {
      invalid = this._invalidIndexes;
      if (!invalid || !this.get('isVisibleInWindow')) return this;
      this._invalidIndexes = NO;

      // tell others we will be reloading
      if (invalid.isIndexSet && invalid.contains(nowShowing)) invalid = YES ;
      if (this.willReload) this.willReload(invalid === YES ? null : invalid);
    }

    // get arrays of items to add/remove
    var itemsToAdd = this._itemsToAdd || (this._itemsToAdd = []);

    // remap
    var oldMap = this.remapItemViews(nowShowing);

    // The oldMap has the items to remove, so supply it to processRemovals
    this.processRemovals(oldMap);

    // handle the invalid set (if it is present)
    if (invalid) {
      this.processUpdates(invalid === YES ? nowShowing : invalid);
    }

    // process items to add
    this.processAdds();

    // only clear the DOM pools if this is not during scrolling. Adding/removing is a
    // bad idea while scrolling :)
    if (!scrollOnly) this.clearDOMPools();

    // clear the lists
    itemsToAdd.length = 0;

    // and if this is a full reload, we need to adjust layout
    if (!scrollOnly) {
      var layout = this.computeLayout();
      if (layout) this.adjust(layout);
      if (this.didReload) this.didReload(invalid === YES ? null : invalid);
    }

    return this;
  },

  /**
    Loops through remove queue and removes.

    @param {Hash} oldMap
  */
  processRemovals: function(oldMap) {
    var content = this.get("content");
    for (var guid in oldMap) {
      var imap = oldMap[guid];
      for (var itemIdx in imap) {
        itemIdx = parseInt(itemIdx, 10);
        if (isNaN(itemIdx)) continue;

        var view = imap[itemIdx];

        if (this._indexMap[itemIdx] === view) delete this._indexMap[itemIdx];

        view._isInCollection = NO;
        this.removeItemView(view);
      }
    }
  },

  /** @private
    Loops through update queue and... updates.
  */
  processUpdates: function(invalid) {
    var u = this._itemsToUpdate, content = this.get("content"), item, view;
    invalid.forEach(function(idx) {
      item = content.objectAt(idx);
      if (view = this.mappedViewForItem(item, idx)) {
        if (!view._isInCollection) return;
        var ex = this.exampleViewForItem(item, idx);
        this.updateItemView(view, ex, item, idx);
      }
    }, this);
  },

  /** @private
    Loops through add queue and, well, adds.
  */
  processAdds: function() {
    var content = this.get("content");

    var add = this._itemsToAdd, idx, len = add.length, itemIdx, item;
    for (idx = 0; idx < len; idx++) {
      itemIdx = add[idx]; item = content.objectAt(itemIdx);

      // get example view and create item view
      var exampleView = this.exampleViewForItem(item, itemIdx);
      var view = this.addItemView(exampleView, item, itemIdx);
    }
  },

  /** @private
    Clear all DOM pools.
  */
  clearDOMPools: function() {
    var pools = this._domPools || (this._domPools = {});
    for (var p in pools) {
      this.clearDOMPool(pools[p]);
    }
  },

  /**
    @type Number
    @default 10
  */
  domPoolSize: 10,

  /** @private
    Clears a specific DOM pool.
  */
  clearDOMPool: function(pool) {
    var idx, len = pool.length, item;

    // we skip one because there is a buffer area of one while scrolling
    for (idx = this.domPoolSize; idx < len; idx++) {
      item = pool[idx];

      // remove from DOM
      this.removeChild(item);

      // release the item
      this.releaseItemView(item);
    }

    // pool is cleared.
    pool.length = Math.min(pool.length, this.domPoolSize);
  },

  /** @private
    Returns the DOM pool for the given exampleView.
  */
  domPoolForExampleView: function(exampleView) {
    var pools = this._domPools || (this._domPools = {}), guid = SC.guidFor(exampleView);
    var pool = pools[guid];
    if (!pool) pool = pools[guid] = [];
    return pool;
  },

  /** @private
    Tries to find an item for the given example view in a dom pool.
    If one could not be found, returns `null`.
  */
  itemFromDOMPool: function(exampleView) {
    var pool = this.domPoolForExampleView(exampleView);
    if (pool.length < 1) return null;
    var view = pool.shift();
    if (view.wakeFromDOMPool) view.wakeFromDOMPool();
    return view;
  },

  /** @private
    Sends a view to a DOM pool.
  */
  sendToDOMPool: function(view) {
    var pool = this.domPoolForExampleView(view.createdFromExampleView);
    pool.push(view);
    var f = view.get("frame");
    view.adjust({ top: -f.height });
    view.set("layerId", SC.guidFor(view));
    if (view.sleepInDOMPool) view.sleepInDOMPool();
  },

  /** @private
    Adds an item view (grabbing the actual item from one of the pools if possible).
  */
  addItemView: function(exampleView, object, index) {
    var view, attrs = this._TMP_ATTRS || (this._TMP_ATTRS = {});

    // in any case, we need attributes
    this.setAttributesForItem(object, index, attrs);

    // try to get from DOM pool first
    if (view = this.itemFromDOMPool(exampleView)) {
      // set attributes
      this.configureItemView(view, attrs);

      // set that it is in the collection
      view._isInCollection = YES;

      // add to view map (if not used, it will be removed)
      this.mapView(object, index, view);
      this._indexMap[index] = view;

      // and that should have repositioned too
      return view;
    }

    // otherwise, just allocate a view
    view = this.allocateItemView(exampleView, attrs);

    // and then, add it
    this.appendChild(view);

    // set that it is in the collection.
    view._isInCollection = YES;

    // add to view map (if not used, it will be removed)
    this.mapView(object, index, view);
    this._indexMap[index] = view;

    return view;
  },

  /** @private
    Removes an item view.
  */
  removeItemView: function(current) {
    if (current.get("layerIsCacheable")) {
      this.sendToDOMPool(current);
    } else {
      this.removeChild(current);
    }
    current._isInCollection = NO;
  },

  /**
    Updates the specified item view. If the view is not "layer cacheable" or the
    example view has changed, it will be redrawn.

    Otherwise, nothing will happen.
  */
  updateItemView: function(current, exampleView, object, index) {
    if (!current.get("layerIsCacheable") || current.createdFromExampleView !== exampleView) {
      // unmap old and remove
      this.unmapView(current, index);
      delete this._indexMap[index];
      this.removeItemView(current, object, index);

      // add new and map
      var newView = this.addItemView(exampleView, object, index);
    } else {
      var attrs = this._TMP_ATTRS || (this._TMP_ATTRS = {});

      this.setAttributesForItem(object, index, attrs);
      this.configureItemView(current, attrs);
    }
  },


  /** @private
    Tells `ScrollView` that this should receive live updates during touch scrolling.
    We are so fast, aren't we?
  */
  _lastTopUpdate: 0,

  /** @private */
  _lastLeftUpdate: 0,

  /** @private */
  _tolerance: 100,

  /** @private */
  touchScrollDidChange: function(left, top) {
    // prevent getting too many in close succession.
    if (Date.now() - this._lastTouchScrollTime < 25) return;

    var clippingFrame = this.get('clippingFrame');

    var cf = this._inScrollClippingFrame || (this._inScrollClippingFrame = {x: 0, y: 0, width: 0, height: 0});
    cf.x = clippingFrame.x; cf.y = clippingFrame.y; cf.width = clippingFrame.width; cf.height = clippingFrame.height;

    // update
    cf.x = left;
    cf.y = top;

    var r = this.contentIndexesInRect(cf);
    if (!r) return; // no rect, do nothing.

    var len = this.get('length'),
        max = r.get('max'), min = r.get('min');

    if (max > len || min < 0) {
      r = r.copy();
      r.remove(len, max-len).remove(min, 0-min).freeze();
    }

    if (this._lastNowShowing) {
      if (r.contains(this._lastNowShowing) && this._lastNowShowing.contains(r)) return;
    }
    this._lastNowShowing = r;
    this.reloadIfNeeded(r, YES);

    this._lastTouchScrollTime = Date.now();
  }

};

/* >>>>>>>>>> BEGIN source/mixins/collection_group.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/**
  @namespace

  Any view you want to use as a group view in a collection must include this
  mixin.
  
  @since SproutCore 1.0
*/
SC.CollectionGroup = {
  
  /**
    @type Array
    @default ['sc-collection-group']
    @see SC.View#classNames
  */
  classNames: ['sc-collection-group']
  
};

/* >>>>>>>>>> BEGIN source/mixins/collection_row_delegate.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


/** 
  @namespace
  
  `CollectionRowDelegate`s are consulted by `SC.ListView` and `SC.TableView` to
  control the height of rows, including specifying custom heights for
  specific rows.
  
  You can implement a custom row height in one of two ways.
*/
SC.CollectionRowDelegate = {

  /**
    Walk like a duck.
  
    @type Boolean
    @default YES
  */
  isCollectionRowDelegate: YES,
  
  /**
    Size of an item without spacing or padding.
    Unless you implement some custom row height
    support, this row height will be used for all items.
    
    @type Number
    @default 18
  */
  itemHeight: 24,
  
  /**
    This inserts empty space between rows that you can use for borders.
    
    @type Number
    @default 0
  */
  rowSpacing: 0,
  
  /**
    This is useful if you are using a custom item view that needs to be padded.
    This value is added to the top and bottom of the `itemHeight`.
    
    @type Number
    @default 0
  */
  rowPadding: 0,
  
  /**
    Total row height used for calculation. Equal to `itemHeight + (2 * rowPadding)`.
    
    @type Number
  */
  rowHeight: function(key, value) {
    var rowPadding = this.get('rowPadding');
    var itemHeight = this.get('itemHeight');

    if (value !== undefined) {
      this.set('itemHeight', value-rowPadding*2);
      return value;
    }

    return itemHeight + rowPadding * 2;
  }.property('itemHeight', 'rowPadding'),

  /**
    Index set of rows that should have a custom row height. If you need
    certain rows to have a custom row height, then set this property to a
    non-null value.  Otherwise leave it blank to disable custom row heights.
    
    @type SC.IndexSet
  */
  customRowHeightIndexes: null,
  
  /**
    Called for each index in the `customRowHeightIndexes` set to get the
    actual row height for the index.  This method should return the default
    rowHeight if you don't want the row to have a custom height.
    
    The default implementation just returns the default rowHeight.
    
    @param {SC.CollectionView} view the calling view
    @param {Object} content the content array
    @param {Number} contentIndex the index 
    @returns {Number} row height
  */
  contentIndexRowHeight: function(view, content, contentIndex) {
    return this.get('rowHeight');
  }

};

/* >>>>>>>>>> BEGIN source/mixins/collection_view_delegate.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/**
  @namespace

  A Collection View Delegate is consulted by a `SC.CollectionView` to make
  policy decisions about certain behaviors such as selection control and
  drag and drop.  If you need to control other aspects of your data, you may
  also want to add the `SC.CollectionContent` mixin.
  
  To act as a Collection Delegate, just apply this mixin to your class.  You
  must then set the "delegate" property on the CollectionView to your object.
  
  Alternatively, if no delegate is set on a CollectionView, but the content 
  implements this mixin, the content object will be used as the delegate 
  instead.
  
  If you set an ArrayController or its arrangedObjects property as the content
  of a CollectionView, the ArrayController will automatically act as the 
  delegate for the view.
  
  @since SproutCore 1.0
*/
SC.CollectionViewDelegate = {

  /**
    Walk like a duck. Used to detect the mixin by SC.CollectionView.
    
    @type Boolean
    @default YES
    @constant
  */
  isCollectionViewDelegate: YES,


  // ..........................................................
  // SELECTION
  // 

  /**
    This method will be called anytime the collection view is about to
    change the selection in response to user mouse clicks or keyboard events.
    
    You can use this method to adjust the proposed selection, eliminating any
    selected objects that cannot be selected.  The default implementation of
    this method simply returns the proposed selection.
    
    @param {SC.CollectionView} view the collection view
    @param {SC.IndexSet} sel Proposed array of selected objects.
    @returns {SC.IndexSet} Actual allow selection index set
  */
  collectionViewSelectionForProposedSelection: function(view, sel) {
    return sel;
  },

  /**
    Called by the collection when attempting to select an item.  Return the
    actual indexes you want to allow to be selected.  Return null to disallow
    the change.  The default allows all selection.
    
    @param {SC.CollectionView} view the view collection view
    @param {SC.IndexSet} indexes the indexes to be selected
    @param {Boolean} extend YES if the indexes will extend existing sel
    @returns {SC.IndexSet} allowed index set
  */
  collectionViewShouldSelectIndexes: function (view, indexes, extend) {
    return indexes;
  },

  /**
    Called by the collection when attempting to deselect an item.  Return the
    actual indexes you want to allow to be deselected.  Return `null` to
    disallow the change.  The default allows all selection.
    
    Note that you should not modify the passed in IndexSet.  clone it instead.
    
    @param {SC.CollectionView} view the view collection view
    @param {SC.IndexSet} indexes the indexes to be selected
    @returns {SC.IndexSet} allowed index set
  */
  collectionViewShouldDeselectIndexes: function (view, indexes) {
    return indexes;
  },


  // ..........................................................
  // EDIT OPERATIONS
  // 

  /**
    Called by the collection view whenever the `deleteSelection()` method is
    called.  You can implement this method to get fine-grained control over
    which items can be deleted.  To prevent deletion, return null.
    
    This method is only called if canDeleteContent is `YES` on the collection
    view.
    
    @param {SC.CollectionView} view the collection view
    @param {SC.IndexSet} indexes proposed index set of items to delete.
    @returns {SC.IndexSet} index set allowed to delete or null.
  */
  collectionViewShouldDeleteIndexes: function(view, indexes) {
    return indexes;
  },

  /**
    Called by the collection view to actually delete the selected items.
    
    The default behavior will use standard array operators to delete the
    indexes from the array. You can implement this method to provide your own
    deletion method.
    
    If you simply want to control the items to be deleted, you should instead
    implement `collectionViewShouldDeleteItems()`. This method will only be
    called if canDeleteContent is `YES` and `collectionViewShouldDeleteIndexes()`
    returns a non-empty index set
    
    @param {SC.CollectionView} view collection view
    @param {SC.IndexSet} indexes the items to delete
    @returns {Boolean} YES if the deletion was a success.
  */
  collectionViewDeleteContent: function(view, content, indexes) {
    if (!content) return NO ;

    if (SC.typeOf(content.destroyAt) === SC.T_FUNCTION) {
      content.destroyAt(indexes);
      view.selectPreviousItem(NO, 1);
      return YES ;
    } else if (SC.typeOf(content.removeAt) === SC.T_FUNCTION) {
      content.removeAt(indexes);
      view.selectPreviousItem(NO, 1);
      return YES;
    } else {
      return NO;
    }
  },


  // ..........................................................
  // DRAGGING
  // 
  
  /**
    Called by the collection view just before it starts a drag to give you
    an opportunity to decide if the drag should be allowed.
    
    You can use this method to implement fine-grained control over when a
    drag will be allowed and when it will not be allowed. For example, you
    may enable content reordering but then implement this method to prevent
    reordering of certain items in the view.
    
    The default implementation always returns `YES`.
    
    @param {SC.CollectionView} view the collection view
    @returns {Boolean} YES to allow, NO to prevent it
  */
  collectionViewShouldBeginDrag: function(view) {
    return YES;
  },

  /**
    Called by the collection view just before it starts a drag so that
    you can provide the data types you would like to support in the data.
    
    You can implement this method to return an array of the data types you
    will provide for the drag data.
    
    If you return `null` or an empty array, can you have set `canReorderContent`
    to `YES` on the CollectionView, then the drag will go ahead but only
    reordering will be allowed.  If `canReorderContent` is `NO`, then the drag
    will not be allowed to start.
    
    If you simply want to control whether a drag is allowed or not, you
    should instead implement `collectionViewShouldBeginDrag()`.
    
    The default returns an empty array.
    
    @param {SC.CollectionView} view the collection view to begin dragging.
    @returns {Array} array of supported data types.
  */
  collectionViewDragDataTypes: function(view) {
    return [];
  },

  /**
    Called by a collection view when a drag concludes to give you the option
    to provide the drag data for the drop.
    
    This method should be implemented essentially as you would implement the
    `dragDataForType()` if you were a drag data source.  You will never be asked
    to provide drag data for a reorder event, only for other types of data.
    
    The default implementation returns null.
    
    @param view {SC.CollectionView} the collection view that initiated the drag
    @param dataType {String} the data type to provide
    @param drag {SC.Drag} the drag object
    @returns {Object} the data object or null if the data could not be provided.
  */
  collectionViewDragDataForType: function(view, drag, dataType) {
    return null;
  },

  /**
    Called once during a drag the first time view is entered. Return all
    possible drag operations OR'd together.
    
    @param {SC.CollectionView} view the collection view that initiated the drag
    @param {SC.Drag} drag the drag object
    @param {Number} proposedDragOperations proposed logical OR of allowed drag operations.
    @returns {Number} the allowed drag operations. Defaults to op
  */
  collectionViewComputeDragOperations: function(view, drag, proposedDragOperations) {
    return proposedDragOperations;
  },

  /**
    Called by the collection view during a drag to let you determine the
    kind and location of a drop you might want to accept.
    
    You can override this method to implement fine-grained control over how
    and when a dragged item is allowed to be dropped into a collection view.
    
    This method will be called by the collection view both to determine in
    general which operations you might support and specifically the operations
    you would support if the user dropped an item over a specific location.
    
    If the `proposedDropOperation` parameter is `SC.DROP_ON` or `SC.DROP_BEFORE`,
    then the `proposedInsertionPoint` will be a non-negative value and you
    should determine the specific operations you will support if the user
    dropped the drag item at that point.
    
    If you do not like the proposed drop operation or insertion point, you
    can override these properties as well by setting the `proposedDropOperation`
    and `proposedInsertionIndex` properties on the collection view during this
    method. These properties are ignored all other times.
    
    @param {SC.CollectionView} view the collection view
    @param {SC.Drag} drag the current drag object
    @param {Number} op proposed logical OR of allowed drag operations.
    @param {Number} proposedInsertionIndex an index into the content array representing the proposed insertion point.
    @param {String} proposedDropOperation the proposed drop operation. Will be one of SC.DROP_ON, SC.DROP_BEFORE, or SC.DROP_ANY.
    @returns the allowed drag operation. Defaults to op
  */
  collectionViewValidateDragOperation: function(view, drag, op, proposedInsertionIndex, proposedDropOperation) {
    // don't allow dropping on by default
    return (proposedDropOperation & SC.DROP_ON) ? SC.DRAG_NONE : op ;
  },
  
  /**
    Called by the collection view to actually accept a drop.  This method will
    only be invoked AFTER your `validateDrop method has been called to
    determine if you want to even allow the drag operation to go through.
    
    You should actually make changes to the data model if needed here and
    then return the actual drag operation that was performed. If you return
    `SC.DRAG_NONE` and the dragOperation was `SC.DRAG_REORDER`, then the default
    reorder behavior will be provided by the collection view.
    
    @param {SC.CollectionView} view
    @param {SC.Drag} drag the current drag object
    @param {Number} op proposed logical OR of allowed drag operations.
    @param {Number} proposedInsertionIndex an index into the content array representing the proposed insertion point.
    @param {String} proposedDropOperation the proposed drop operation.  Will be one of SC.DROP_ON, SC.DROP_BEFORE, or SC.DROP_ANY.
    @returns the allowed drag operation. Defaults to proposedDragOperation
  */
  collectionViewPerformDragOperation: function(view, drag, op, proposedInsertionIndex, proposedDropOperation) {
    return SC.DRAG_NONE;
  },
  
  /**
    Renders a drag view for the passed content indexes. If you return null
    from this, then a default drag view will be generated for you.
    
    The default implementation returns null.
    
    @param {SC.CollectionView} view
    @param {SC.IndexSet} dragContent
    @returns {SC.View} view or null
  */
  collectionViewDragViewFor: function(view, dragContent) {
    return null;
  },

  /**
    Allows the ghost view created in `collectionViewDragViewFor` to be displayed
    like a cursor instead of the default implementation. This sets the view 
    origin to be the location of the mouse cursor.
    
    @type Boolean
    @default NO
  */
  ghostActsLikeCursor: NO
  
};

/* >>>>>>>>>> BEGIN source/mixins/navigation_builder.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


/**
  @namespace
  NavigationBuilder is an implementation of the Builder protocol. It implements
  `buildIn`/`Out` (though these only relay to `buildIn`/`OutNavigation, so feel free to
  override if needed; the navigation builders will still be accessible).
  
  Building in and out animates the view in and out to and from the left and right.
*/
SC.NavigationBuilder = {

  /**
    Walk like a duck.
    
    @type Boolean
    @default YES
    @constant
  */
  isNavigationBuilder: YES,
  
  /**
    The transitions to be used for navigation; these are mixed in to the existing
    transitions hash if one exists, or become the transitions hash otherwise.
    
    If NO, it uses the (hard-coded) defaults.
    
    @type Boolean
    @default NO
  */
  navigationTransitions: NO,
  
  initMixin: function() {
    // force integrate SC.Animatable
    var animatable = SC.Animatable;
    if (animatable && !this.isAnimatable) {
      // okay, let's mix it in!
      this.mixin(animatable);
    } else if (!animatable) { 
      // check that we actually have SC.Animatable
      SC.Logger.error(
        "SC.NavigationView and SC.NavigationBuilder require SC.Animatable " + 
        "to perform animations, but it is not present. Please ensure your app or framework " +
        "references it."
      );
    }
    
    var navigationTransitions = this.get("navigationTransitions");
    if (!navigationTransitions && SC.Animatable) {
      navigationTransitions = {
        // these being identical helps us.
        left: { duration: 0.25, timing: SC.Animatable.TRANSITION_EASE_IN_OUT, action: "navigationBuildDidFinish" },
        transform: { duration: 0.25, timing: SC.Animatable.TRANSITION_EASE_IN_OUT, action: "navigationBuildDidFinish" }
      };
    }
    
    // mix in transitions (a base set will have been added by SC.Animatable alrady)
    if (SC.Animatable) SC.mixin(this.transitions, navigationTransitions);
  },
  
  /** @private
    Determines metrics of the view. This may be adapted to work with non-CSS transforms in future...
  */
  metrics: function() {
    var f = this.computeFrameWithParentFrame();
    return f;
  },
  
  /** @private
    Applies the supplied CSS transform.
  */
  transform: function(pos) {
    if (SC.platform.supportsCSS3DTransforms) {
      this.adjust("transform", "translate3d(" + pos + "px,0px,0px)");
    } else {
      this.adjust("transform", "translate(" + pos + "px,0px)");
    }
  },
  
  buildInNavigation: function() {
    // set initial state
    var metrics = this.metrics();
    this.disableAnimation();
    this.transform(this.get("buildDirection") === SC.TO_LEFT ? metrics.width : -metrics.width);
    this.enableAnimation();
    
    // now, (delayed) call transform to go to the correct spot
    this.invokeLater("transform", 10, 0);
  },
  
  buildOutNavigation: function() {
    // we already have an initial state
    var metrics = this.metrics();
    this.transform(this.get("buildDirection") === SC.TO_LEFT ? -metrics.width : metrics.width);
  },
  
  /**
    You may override this. If you do, call `buildInNavigation` to call the original functionality.
    You may need to override `navigationBuildDidFinish` as well if you call `buildInNavigation`.
  */
  buildIn: function() {
    this.buildInNavigation();
  },
  
  /**
    You may override this. If you do, call `buildOutNavigation` to call the original functionality.
    You may need to override `navigationBuildDidFinish`as well if you call `buildOutNavigation`.
  */
  buildOut: function() {
    this.buildOutNavigation();
  },
  
  /**
    This ensures that the view has a CSS transform set, even if it is added without build in, etc.
  */
  resetBuild: function() {
    this.transform(0);
  },
  
  /**
    Called when the transitions finish.
  */
  navigationBuildDidFinish: function() {
    if (this.isBuildingIn) {
      this.buildInDidFinish();
    } else if (this.isBuildingOut) {
      this.buildOutDidFinish();
    }
  }
  
} ;


/* >>>>>>>>>> BEGIN source/mixins/scrollable.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


/**
  @namespace
  @deprecated Use SC.ScrollView instead.

  Any views you implement that are scrollable should include this mixin to
  provide basic support for scrolling actions.  You can also override any
  of these methods as needed for your own specific behaviors.

  Often times instead of adding `SC.Scrollable` to your view, you should
  place your view inside of an `SC.ScrollView`.  See that class for more
  info.

  Note that isScrollable must always be true.
*/
SC.Scrollable = {


  initMixin: function() {
    SC.Logger.warn("SC.Scrollable is deprecated and will be removed in a future version of SproutCore.  Consider pulling the mixin into your own app if you want to keep using it.");
  },


  /** Informs the view system that the receiver is scrollable.

    Must always be `true.

    @type Boolean
    @default YES
    @constant
  */
  isScrollable: true,

  /**
    Amount to scroll one vertical line.

    Used by the default implementation of `scrollDownLine()` and `scrollUpLine()`.

    @type Number
    @default 20
  */
  verticalLineScroll: 20,

  /**
    Amount to scroll one horizontal line.

    Used by the default implementation of `scrollLeftLine()` and `scrollRightLine()`.

    @type Number
    @default 20
  */
  horizontalLineScroll: 20,

  /**
    Amount to scroll one vertical page.

    Used by the default implementation of `scrollUpPage()` and `scrollDownPage()`. Defaults to
    current `innerFrame` height.
  */
  verticalPageScroll: function() {
    return this.get('innerFrame').height;
  }.property('innerFrame'),

  /**
    Amount to scroll one horizontal page.

    Used by the default implementation of `scrollLeftPage()` and `scrollRightPage()`.  Defaults
    to current `innerFrame` width.
  */
  horizontalPageScroll: function() {
    return this.get('innerFrame').width ;
  }.property('innerFrame'),

  /**
    Returns true if the receiver has enough vertical content to require
    scrolling.

    If you do not want to allow vertical scrolling, override this to be false
    and set the appropriate CSS.

    @field {Boolean}
  */
  hasVerticalScroller: function() {
    return this.get('scrollFrame').height > this.get('innerFrame').height;
  }.property('scrollFrame'),

  /**
    Returns true if the receiver has enough horizontal content to require
    scrolling.

    If you do not want to allow horizontal scrolling, override this to be
    false and set the appropriate CSS.

    @field {Boolean}
  */
  hasHorizontalScroller: function() {
    return this.get('scrollFrame').width > this.get('innerFrame').width;
  }.property('scrollFrame'),

  /**
    Scrolls the receiver in the horizontal and vertical directions by the
    amount specified, if allowed.

    @param {Point} amount the amount to scroll.  Must include x, y or both
    @returns {Point} the actual amount scrolled.
  */
  scrollBy: function(amount) {
    var sf = this.get('scrollFrame') ;
    var f = this.get('innerFrame') ;

    if (!this.get('hasVerticalScroller')) amount.y = 0 ;
    if (sf.height <= f.height) amount.y = 0 ;

    if (!this.get('hasHorizontalScroller')) amount.x = 0 ;
    if (sf.width <= f.width) amount.x = 0 ;

    // compute new sf
    var newSf = { x: sf.x - (amount.x || 0), y: sf.y - (amount.y || 0) } ;
    this.set('scrollFrame', newSf) ;
    newSf = this.get('scrollFrame') ;

    return { x: newSf.x - sf.x, y: newSf.y - sf.y };
  },

  /**
    Scrolls the receiver to the specified x,y coordinate

    @param {Number} x
    @param {Number} y
  */
  scrollTo: function(x,y) {
    this.set('scrollFrame', { x: 0-x, y: 0-y });
  },

  /**
    Scroll the view to make the passed frame visible.

    Frame must be relative to the receiver's `offsetParent`.

    @param {SC.View} view the view you want to make visible
  */
  scrollToVisible: function(view) {
    // get frames and convert them to proper offsets
    var f = this.get('innerFrame') ;
    var sf = this.get('scrollFrame') ;

    // frame of the view, relative to the top of the scroll frame
    var vf = this.convertFrameFromView(view.get('frame'), view) ;
    vf.x -= (f.x + sf.x); vf.y -= (f.y + sf.y);

    // first visible origin
    var vo = {
      x: 0-sf.x,
      y: 0-sf.y,
      width: f.width,
      height: f.height
    };

    // if top edge is not visible, shift origin
    vo.y -= Math.max(0, SC.minY(vo) - SC.minY(vf)) ;
    vo.x -= Math.max(0, SC.minX(vo) - SC.minX(vf)) ;

    // if bottom edge is not visible, shift origin
    vo.y += Math.max(0, SC.maxY(vf) - SC.maxY(vo)) ;
    vo.x += Math.max(0, SC.maxX(vf) - SC.maxX(vo)) ;

    // scroll to that origin.
    this.scrollTo(vo.x, vo.y) ;
  },

  /**
    Scrolls the receiver down one line if allowed.

    @param {Number} lines number of lines to scroll
    @returns {Number} the amount actually scrolled.
  */
  scrollDownLine: function(lines) {
    if (lines === undefined) lines = 1 ;
    return this.scrollBy({ y: this.get('verticalLineScroll')*lines }).y ;
  },

  /**
    Scrolls the receiver down up line if allowed.

    @param {Number} lines number of lines to scroll
    @returns {Number} the amount actually scrolled.
  */
  scrollUpLine: function(lines) {
    if (lines === undefined) lines = 1 ;
    return 0-this.scrollBy({ y: 0-this.get('verticalLineScroll')*lines }).y ;
  },

  /**
    Scrolls the receiver right one line if allowed.

    @param {Number} lines number of lines to scroll
    @returns {Number} the amount actually scrolled.
  */
  scrollRightLine: function(lines) {
    if (lines === undefined) lines = 1 ;
    return this.scrollTo({ y: this.get('horizontalLineScroll')*lines }).x ;
  },

  /**
    Scrolls the receiver left one line if allowed.

    @param {Number} lines number of lines to scroll
    @returns {Number} the amount actually scrolled.
  */
  scrollLeftLine: function(lines) {
    if (lines === undefined) lines = 1 ;
    return 0-this.scrollTo({ y: 0-this.get('horizontalLineScroll')*lines }).x ;
  },

  /**
    Scrolls the receiver down one page if allowed.

    @param {Number} pages number of pages to scroll
    @returns {Number} the amount actually scrolled.
  */
  scrollDownPage: function(pages) {
    if (pages === undefined) pages = 1 ;
    return this.scrollBy({ y: this.get('verticalPageScroll')*pages }).y ;
  },

  /**
    Scrolls the receiver down up page if allowed.

    @param {Number} pages number of pages to scroll
    @returns {Number} the amount actually scrolled.
  */
  scrollUpPage: function(pages) {
    if (pages === undefined) pages = 1 ;
    return 0-this.scrollBy({ y: 0-this.get('verticalPageScroll')*pages }).y ;
  },

  /**
    Scrolls the receiver right one page if allowed.

    @param {Number} pages number of pages to scroll
    @returns {Number} the amount actually scrolled.
  */
  scrollRightPage: function(pages) {
    if (pages === undefined) pages = 1 ;
    return this.scrollTo({ y: this.get('horizontalPageScroll')*pages }).x ;
  },

  /**
    Scrolls the receiver left one page if allowed.

    @param {Number} pages number of pages to scroll
    @returns {Number} the amount actually scrolled.
  */
  scrollLeftPage: function(pages) {
    if (pages === undefined) pages = 1 ;
    return 0-this.scrollTo({ y: 0-this.get('horizontalPageScroll')*pages }).x ;
  }

} ;


/* >>>>>>>>>> BEGIN source/mixins/split_child.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2010 Sprout Systems, Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/** @private
  SC.SplitChild and SC.SplitThumb both share this code, but we don't want it
  included twice if the view mixes in both SC.SplitChild and SC.SplitThumb.
*/
SC.NeedsSplitParent = {

  /**
   * The SplitView that contains the child views to be adjusted.
   *
   * This is computed to be the first SplitView found in a search
   * up the view hierarchy. You can substitute your own SplitView
   *
   * @property SC.SplitView
  */
  splitView: function () {
    var view = this.get('parentView');
    while (view && !view.isSplitView) view = view.get('parentView');
    return view;
  }.property('parentView').cacheable(),

  /**
   * The layoutDirection of the SplitView. This is observed so that we
   * can update positioning if the layoutDirection changes but the position
   * and size properties do not.
   *
   * @type {LayoutDirection}
  */
  // NOTE: While an edge case, this is implemented because it makes it _much_
  // easier to write the sample in the Test Controls app.
  splitViewLayoutDirection: null,
  splitViewLayoutDirectionBinding: SC.Binding.oneWay('*splitView.layoutDirection')

};


/**
  @namespace
  Child views of SplitViews should use this mixin to get their positioning
  logic and default settings.

  By default, SplitView merely sets the position and size properties on its
  child views. This mixin observes the position and size properties and
  calls adjust().
*/
SC.SplitChild =
  /** @scope SC.SplitChild.prototype */{
  /**
   * Set to YES if your Split Child is a divider view.
   *
   * @type Boolean
  */
  isSplitDivider: NO,

  /**
   * The minimum size for the SC.SplitView child. This view will
   * be unable to be resized smaller than this size.
   *
   * @default 100
   *
   * @type {Number}
  */
  minimumSize: 100,

  /**
   * The maximum size for the SC.SplitView child. This view will
   * be unable to be resized to a size larger than this value.
   *
   * If undefined, there is no limit.
   *
   * @default 100
   *
   * @type {Number}
  */
  maximumSize: undefined,

  /**
   * The current size of the SC.SplitView child. Use this to set the default
   * size.
   *
   * If you specify a size, autoResizeStyle will default to SC.RESIZE_MANUAL;
   * if you don't, SplitView will assume you want it to fill the available space
   * and use SC.RESIZE_AUTOMATIC.
   *
   * @default undefined
   *
   * @type Number
  */
  size: undefined,

  /**
   * [RO] The current position of the SC.SplitView. This is read-only, and is set
   * by the SplitView as it positions the views.
   *
   * @type Number
  */
  position: 0,

  /**
   * An amount to add to the position when adjusting layout.
   *
   * For example, if SC.SplitView positions this view at 100, and
   * positionOffset is -5, the view's layout will will have a position of 95.
   *
   * This can be used in conjunction with sizeOffset to make dividers
   * overlap the other views in the SplitView to have a larger grab area.
   *
   * TODO: Get this value from theme.
   *
   * @type Number
  */
  positionOffset: SC.propertyFromRenderDelegate('splitPositionOffset', 0),

  /**
   * An amount to add to the assigned size when adjusting layout.
   *
   * For example, if SC.SplitView gives this view a size of 1, but the
   * sizeOffset is 10, the view's layout will be given a width or height of 11.
   *
   * This can be used in conjunction with positionOffset to make dividers
   * overlap the other views in the SplitView to have a larger grab area.
   *
   * TODO: Get this value from theme.
   *
   * @type Number
  */
  sizeOffset: SC.propertyFromRenderDelegate('splitSizeOffset', 0),

  /**
   * If YES, the SC.SplitView can collapse this view when the user
   * double-clicks an adjacent divider, or when the view is resized
   * to a size smaller than the collapseAtSize.
   *
   * @type {Boolean}
  */
  canCollapse: NO,

  /**
   * If the user attempts to resize the view to a size below this number,
   * the view will collapse.
   *
   * If undefined, the view cannot be collapsed due to a resize.
   *
   * @type {Number}
  */
  collapseAtSize: undefined,

  /**
   * When (and if) the view should automatically resize due to the SplitView changing size.
   *
   * - SC.RESIZE_AUTOMATIC: always resize when the SplitView changes size.
   * - SC.RESIZE_MANUAL: resize only when the user moves a divider, or all
   *   SC.RESIZE_AUTOMATIC views have already been resized as much as possible.
   * - SC.FIXED_SIZE: Never resize.
   *
   * If you specify an autoResizeStyle, it will be used. If you leave it at `undefined`,
   * it will look at `size`: if a `size` is supplied, it will use `SC.RESIZE_MANUAL`; otherwise
   * it will use `SC.RESIZE_AUTOMATIC`.
   *
   * @default based on size
   * @type {AutoResizeStyle}
  */
  autoResizeStyle: undefined,

  /**
   * If NO, moving the divider before this view will not resize the view, but
   * instead, move it—causing further views to move as well. Most SplitView
   * children will want this set to YES.
   *
   * @type Boolean
  */
  compensatesForMovement: YES,

  /**
   * When NO, the view can only be adjusted when the user drags a divider
   * immediately adjacent to it. If YES, the view can be adjusted indirectly
   * from earlier dividers as well.
   *
   * For example, assume you have a 3-pane setup. Increasing the size of left pane will
   * resize the middle one until its minimum size is reached. SplitView will then
   * try to adjust the right pane. If the right pane has allowsIndirectAdjustments
   * set to YES, SplitView will shrink the right pane to make way. If NO, the
   * left pane will be unable to resize further.
   *
   * Default: YES.
   *
   * @type {Boolean}
  */
  allowsIndirectAdjustments: YES,

  /** @private Include SC.NeedsSplitParent if it hasn't already been included. */
  initMixin: function () {
    if (!this.splitView) {
      this.mixin(SC.NeedsSplitParent);
    }
  },

  //
  // Positioning logic
  //
  _scsvc_positionOrSizeDidChange: function() {
    this.invokeOnce('splitChildLayoutDidChange');
  }.observes('position', 'size'),

  /**
   * Called when either the position or size of the child has changed, and layout
   * needs to be updated accordingly. You may override this method to take into
   * account any custom layout. The default handles the position- and sizeOffset
   * properties by adding them to the position and size, respectively.
   *
   * For instance, while the default implementation changes left/right/width/height
   * to fill in one direction and fit in the allocated position in the other, you could
   * make it only set left/width or top/height.
   *
  */
  splitChildLayoutDidChange: function() {
    var split = this.get('splitView');
    if (!split) return;

    var position = this.get('position') + this.get('positionOffset'),
        size = this.get('size') + this.get('sizeOffset');


    if (split.get('layoutDirection') === SC.LAYOUT_HORIZONTAL) {
      this.set('layout', {
        left: position,
        width: size,
        top: 0, bottom: 0
      });
    } else {
      this.set('layout', {
        top: position,
        height: size,
        right: 0, left: 0
      });
    }
  },

  splitViewLayoutDirectionDidChange: function() {
    this.invokeOnce('splitChildLayoutDidChange');
  }.observes('splitViewLayoutDirection')
};

/* >>>>>>>>>> BEGIN source/mixins/split_thumb.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2010 Sprout Systems, Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/**
  Tells the SplitThumb to automatically choose which child of the SplitView
  to move in response to touch or mouse events in an SC.SplitThumb.
*/
SC.MOVES_AUTOMATIC_CHILD = 'moves-automatic-child';

/**
  Tells the SplitThumb to move the child of the SplitView that is
  either the SplitThumb or a parent of it.
*/
SC.MOVES_CHILD = 'moves-child';

/**
  Tells the SplitThumb to move the child of the SplitView that
  preceeds the child that is either the SplitThumb or a parent of it.
*/
SC.MOVES_PREVIOUS_CHILD = 'moves-previous-child';

/**
  Tells the SplitThumb to move the child of the SplitVie that
  comes after the child that is either the SplitThumb or a parent of it.
*/
SC.MOVES_NEXT_CHILD = 'moves-next-child';

/**
  @namespace
  A SplitThumb may be placed inside any view in a SplitView, and can even
  be a direct child of the SplitView. It forwards its events to the SplitView
  to control the movement of a divider or another child of the SplitView.

  Using a view that mixes in SplitThumb, you can place a handle that moves the
  divider anywhere inside the SplitView's view tree.

  SplitThumb will automatically choose which divider to move. It's choice will
  almost always be correct for 2-pane layouts. However, in 3-pane layouts, you
  may want to adjust the way it chooses.

  You can adjust the behavior by setting the movesSibling property to
  SC.MOVES_NEXT_CHILD or SC.MOVES_PREVIOUS_CHILD. If your ThumbView is inside
  the middle pane, for instance, this would tell it whether the ThumbView
  should move the divider to the left, or the divider to the right.
*/
SC.SplitThumb = {

  /**
   * The child which should be moved by any mouse or touch events. Should usually
   * be a divider view.
   *
   * The default implementation calculates the child by first finding
   * the ancestor of this view that is a direct child of the SplitView,
   * and then either returning it or one of its immediate siblings, depending
   * on the value of the movesSibling property.
   *
   * @property SC.View
  */
  movesChild: function () {
    var view = this, child, splitView = this.get('splitView'),
        sibling = this.get('movesSibling');
    while (view && view !== splitView) {
      child = view;
      view = view.get('parentView');
    }

    if (sibling === SC.MOVES_NEXT_CHILD) return child.nextView;
    if (sibling === SC.MOVES_PREVIOUS_CHILD) return child.previousView;

    if (sibling === SC.MOVES_AUTOMATIC_CHILD) {
      if (!child.nextView) return child.previousView;
      if (!child.previousView) return child.nextView;
    }

    return child;
  }.property('splitView', 'movesSibling').cacheable(),

  /**
   * Decides whether an ancestor of this SplitThumb view or one of its
   * siblings is to be moved in response to events.
   *
   * Usually, you want events to move a divider. If the SplitThumb is inside
   * a view which is _not_ a divider, you probably want to move one of the
   * view's siblings-one that _is_ a divider.
   *
   * You can tell SC.SplitThumb to:
   *
   * - SC.MOVES_AUTOMATIC_CHILD: if the SplitView child is either first or last,
   *   moves the adjacent child (likely a divider). Otherwise moves the child itself.
   *
   * - SC.MOVES_CHILD: moves the child itself, not one of its siblings. Divider
   *   views could use this setting.
   *
   * - SC.MOVES_PREVIOUS_CHILD: moves the previous child. For instance, in a
   *   two-pane setup, if the SplitThumb is in the rightmost child, this will
   *   move the divider between the two children.
   *
   * - SC.MOVES_NEXT_CHILD: moves the next child.
   *
   * @type TYPE
  */
  movesSibling: SC.MOVES_AUTOMATIC_CHILD,

  /**
   * The SplitView that contains the child views to be adjusted.
   *
   * This is computed to be the first SplitView found in a search
   * up the view hierarchy. You can substitute your own SplitView
   *
   * @property SC.SplitView
  */
  // splitView: function () {
  //   var view = this;
  //   while (view && !view.isSplitView) view = view.get('parentView');
  //   return view;
  // }.property('parentView').cacheable(),

  /**
   * The layoutDirection of the SplitView. This is observed so that we
   * can update positioning if the layoutDirection changes but the position
   * and size properties do not.
   *
   * NOTE: duplicated in SplitChild because both this and SplitChild use it.
   *
   * @type {LayoutDirection}
  */
  // NOTE: While an edge case, this is implemented because it makes it _much_
  // easier to write the sample in the Test Controls app.
  // splitViewLayoutDirection: null,
  // splitViewLayoutDirectionBinding: SC.Binding.oneWay('*splitView.layoutDirection'),

  /**
   * The name of the CSS cursor that should be used for splitting.
   * The containing SplitView will adopt this cursor if and when this
   * view is dragged.
   *
   * Computed based on the SplitView's layoutDirection.
   *
   * @type {String}
  */
  splitCursorStyle: function () {
    if (this.get('splitViewLayoutDirection') === SC.LAYOUT_HORIZONTAL) {
      return 'ew-resize';
    } else {
      return 'ns-resize';
    }
  }.property('splitViewLayoutDirection').cacheable(),

  splitCursorStyleDidChange: function () {
    if (this._isDragging) {
      this.get('splitView').set('splitChildCursorStyle', this.get('splitCursorStyle'));
    }

    this.$().css('cursor', this.get('splitCursorStyle'));
  }.observes('splitCursorStyle'),

  /** @private Include SC.NeedsSplitParent if it hasn't already been included. */
  initMixin: function () {
    if (!this.splitView) {
      this.mixin(SC.NeedsSplitParent);
    }
  },

  /**
   * @private
   * Renders the cursor for the view as defined by this view's splitCursor
   * property.
  */
  renderMixin: function (context) {
    context.setStyle('cursor', this.get('splitCursorStyle'));
  },

  //
  // EVENT HANDLING
  //
  touchStart: function (touch) {
    this._isDragging = YES;

    var splitView = this.get('splitView');
    splitView.beginLiveResize();

    this._scst_mouseStartPosition = splitView.get('layoutDirection') === SC.LAYOUT_HORIZONTAL ?
      touch.pageX : touch.pageY;

    this._scst_childStartPosition = splitView.getPositionForChild(this.get('movesChild'));

    return YES;
  },

  touchesDragged: function (evt) {
    var splitView = this.get('splitView');

    var mousePosition = splitView.get('layoutDirection') === SC.LAYOUT_HORIZONTAL ?
      evt.pageX : evt.pageY;

    var diff = mousePosition - this._scst_mouseStartPosition,
        start = this._scst_childStartPosition;

    splitView.adjustPositionForChild(this.get('movesChild'), start + diff);

    return YES;
  },

  touchEnd: function (touch) {
    this._isDragging = NO;

    var splitView = this.get('splitView');

    var mousePosition = splitView.get('layoutDirection') === SC.LAYOUT_HORIZONTAL ?
      touch.pageX : touch.pageY;

    var diff = mousePosition - this._scst_mouseStartPosition,
        start = this._scst_childStartPosition;

    splitView.adjustPositionForChild(this.get('movesChild'), start + diff);

    splitView.set('splitChildCursorStyle', null);
    splitView.endLiveResize();
    return YES;
  },

  mouseDown: function (evt) {
    var splitView = this.get('splitView');
    splitView.set('splitChildCursorStyle', this.get('splitCursorStyle'));

    return this.touchStart(evt);
  },

  mouseDragged: function (evt) {
    return this.touchesDragged(evt);
  },

  mouseUp: function (evt) {
    this.get('splitView').set('splitChildCursorStyle', null);

    return this.touchEnd(evt);
  }

};

/* >>>>>>>>>> BEGIN source/panes/modal.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


/** @class

  A modal pane is used to capture mouse events inside a pane that is modal.
  You normally will not work with modal panes directly, though you may set
  the modalPane property to a subclass of this pane when designing custom
  panes.

  A modal pane is automatically appended when a pane with isModal set to
  `YES` is made visible and removed when the same pane is hidden.  The only
  purpose of the `ModalPane` is to absorb mouse events so that they cannot
  filter through to the underlying content.

  @extends SC.Pane
  @since SproutCore 1.0
*/
SC.ModalPane = SC.Pane.extend(
/** @scope SC.ModalPane.prototype */{

  /**
    @type Array
    @default ['sc-modal']
    @see SC.View#classNames
  */
  classNames: 'sc-modal',

  /** @private */
  _openPaneCount: 0,

  /** @private
    Called by a pane just before it appends itself.   The modal pane can
    make itself visible first if needed.

    @param {SC.Pane} pane the pane
    @returns {SC.ModalPane} receiver
  */
  paneWillAppend: function(pane) {
    var _tmpPane;
    this._openPaneCount++;
    if (!this.get('isVisibleInWindow')) this.append();
    var panes = SC.RootResponder.responder.panes;
    for(var i=0, iLen=panes.length; i<iLen; i++ ){
      _tmpPane = panes[i];
      if(_tmpPane!==pane) {
        //_tmpPane.set('ariaHidden', YES);
        this._hideShowTextfields(_tmpPane, NO);
      }
    }
    return this ;
  },

  /** @private
    Called by a pane just after it removes itself.  The modal pane can remove
    itself if needed.   Modal panes only remove themselves when an equal
    number of `paneWillAppend()` and `paneDidRemove()` calls are received.

    @param {SC.Pane} pane the pane
    @returns {SC.ModalPane} receiver
  */
  paneDidRemove: function(pane) {
    var _tmpPane;
    this._openPaneCount--;
    var panes = SC.RootResponder.responder.panes;
    for(var i=0, iLen=panes.length; i<iLen; i++ ){
      _tmpPane = panes[i];
      if(_tmpPane!==pane) {
        //_tmpPane.set('ariaHidden', NO);
        this._hideShowTextfields(_tmpPane, YES);
      }
    }
    if (this._openPaneCount <= 0) {
      this._openPaneCount = 0 ;
      if (this.get('isVisibleInWindow')) this.remove();
    }
  },

  /** @private
    If `focusable` is NO all SC.TextFieldViews not belonging to the given
    pane will have isBrowserFocusable set to NO.  If `focusable` is YES, then
    all SC.TextFieldViews not belonging to the given pane will have
    isBrowserFocusable set to YES, unless they previously had it set explictly
    to NO.
  */
  _hideShowTextfields: function(pane, focusable){
    var view;

    for (view in SC.View.views) {
      view = SC.View.views[view];
      if (view.get('isTextField') && view !== pane && view.get('pane') === pane) {
        if (focusable) {
          // Setting isBrowserFocusable back to YES. If we cached the previous
          // value, use that instead.
          if (view._scmp_isBrowserFocusable !== undefined) {
            focusable = view._scmp_isBrowserFocusable;

            // Clean up entirely.
            delete view._scmp_isBrowserFocusable;
          }
        } else {
          // Cache the value of isBrowserFocusable. If the text field
          // already had isBrowserFocusable: NO, we don't want to
          // set it back to YES.
          view._scmp_isBrowserFocusable = view.get('isBrowserFocusable');
        }
        view.set('isBrowserFocusable', focusable);
      }
    }
  },

  /** @private */
  mouseDown: function(evt) {
    var owner = this.get('owner');
    if (owner && owner.modalPaneDidClick) owner.modalPaneDidClick(evt);
  },

  /** @private */
  touchStart: function(evt) {
    this.mouseDown(evt);
  }
});

/* >>>>>>>>>> BEGIN source/panes/panel.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('panes/modal');

/** @class

  Most SproutCore applications need modal panels. The default way to use the
  panel pane is to simply add it to your page like this:

      SC.PanelPane.create({
        layout: { width: 400, height: 200, centerX: 0, centerY: 0 },
        contentView: SC.View.extend({
        })
      }).append();

  This will cause your panel to display.  The default layout for a Panel
  is to cover the entire document window with a semi-opaque background, and to
  resize with the window.

  @extends SC.Pane
  @author Erich Ocean
  @since SproutCore 1.0
*/
SC.PanelPane = SC.Pane.extend(
/** @scope SC.PanelPane.prototype */ {

  /**
    Walk like a duck.
    @type {Boolean}
  */
  isPanelPane: YES,

  /**
    @type Array
    @default ['sc-panel']
    @see SC.View#classNames
  */
  classNames: ['sc-panel'],

  /**
    @type Boolean
    @default YES
    @see SC.Pane#acceptsKeyPane
  */
  acceptsKeyPane: YES,

  /**
    The WAI-ARIA role for panel pane.

    @type String
    @default 'dialog'
    @constant
  */
  ariaRole: 'dialog',

  /**
    The WAI-ARIA label for the panel. Screen readers will use this to tell
    the user a name for the panel.

    @type String
  */
  ariaLabel: null,

  /**
    The WAI-ARIA labelledby for the panel. Screen readers will use this to tell
    the header or name of your panel if there is no label. This should be an id
    to an element inside the panel.

    @type String
  */
  ariaLabelledBy: null,

  /**
    The WAI-ARIA describedby text. Screen readers will use this to speak the description
    of the panel. This should be an id to an element inside the panel.

    @type String
  */
  ariaDescribedBy: null,

  /**
    Indicates that a pane is modal and should not allow clicks to pass
    though to panes underneath it. This will usually cause the pane to show
    the modalPane underneath it.

    @type Boolean
    @default YES
  */
  isModal: YES,

  /**
    The modal pane to place behind this pane if this pane is modal. This
    must be a subclass or an instance of SC.ModalPane.
  */
  modalPane: SC.ModalPane.extend({
    classNames: 'for-sc-panel'
  }),

  // ..........................................................
  // CONTENT VIEW
  //

  /**
    Set this to the view you want to act as the content within the panel.

    @type SC.View
    @default null
  */
  contentView: null,
  contentViewBindingDefault: SC.Binding.single(),

  /**
    @param {SC.View} newContent
  */
  replaceContent: function(newContent) {
    this.removeAllChildren() ;
    if (newContent) this.appendChild(newContent);
  },

  /** @private */
  createChildViews: function() {
    // if contentView is defined, then create the content
    var view = this.contentView ;
    if (view) {
      view = this.contentView = this.createChildView(view) ;
      this.childViews = [view] ;
    }
  },


  /**
    Invoked whenever the content property changes. This method will simply
    call replaceContent. Override replaceContent to change how the view is
    swapped out.
  */
  contentViewDidChange: function() {
    this.replaceContent(this.get('contentView'));
  }.observes('contentView'),

  // ..........................................................
  // INTERNAL SUPPORT
  //

  /**
    The name of the theme's `SC.PanelPane` render delegate.

    @type String
    @default 'panelRenderDelegate'
  */
  renderDelegateName: 'panelRenderDelegate',

  // get the modal pane.
  _modalPane: function() {
    var pane = this.get('modalPane');

    // instantiate if needed
    if (pane && pane.isClass) {
      pane = pane.create({ owner: this });
      this.set('modalPane', pane);
    }

    return pane ;
  },

  /** @private - whenever showing on screen, deal with modal pane as well */
  appendTo: function(elem) {
    var pane ;
    if (!this.get('isVisibleInWindow') && this.get('isModal') && (pane = this._modalPane())) {
      this._isShowingModal = YES;
      pane.paneWillAppend(this);
    }
    return arguments.callee.base.apply(this,arguments);
  },

  /** @private - when removing from screen, deal with modal pane as well. */
  remove: function() {
    var pane, ret = arguments.callee.base.apply(this,arguments);

    if (this._isShowingModal) {
      this._isShowingModal = NO ;
      if (pane = this._modalPane()) pane.paneDidRemove(this);
    }
    return ret ;
  },

  destroy: function() {
    var modal = this.get('modalPane');
    if (modal && !modal.isClass) {
      modal.destroy();
    }

    arguments.callee.base.apply(this,arguments);
  },

  /** @private - if isModal state changes, update pane state if needed. */
  _isModalDidChange: function() {
    var pane, isModal = this.get('isModal');
    if (isModal) {
      if (!this._isShowingModal && this.get('viewState') & SC.CoreView.IS_SHOWN && (pane = this._modalPane())) {
        this._isShowingModal = YES;
        pane.paneWillAppend(this);
      }
    } else {
      if (this._isShowingModal && (pane = this._modalPane())) {
        this._isShowingModal = NO ;
        pane.paneDidRemove(this);
      }
    }
  }.observes('isModal'),

  /**
    Called when the pane is shown.  Takes on key pane status.
  */
  didShowInDocument: function () {
   this.becomeKeyPane();
  },

  /**
    Called when the pane is attached.  Takes on key pane status.
  */
  didAppendToDocument: function () {
    this.becomeKeyPane();
  },

  /**
    Called when the pane is detached.  Resigns key pane status.
  */
  willRemoveFromDocument: function () {
    this.resignKeyPane();
  },

  /**
    Called when the pane is about to be hidden.  Resigns key pane status.
  */
  willHideInDocument: function () {
   this.resignKeyPane();
  },

  displayProperties: ['ariaLabel', 'ariaLabelledBy', 'ariaDescribedBy']

});

/* >>>>>>>>>> BEGIN source/views/button.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/**
  @static
  @constant
  @type String
*/
SC.TOGGLE_BEHAVIOR = 'toggle';

/**
  @static
  @constant
  @type String
*/
SC.PUSH_BEHAVIOR = 'push';

/**
  @static
  @constant
  @type String
*/
SC.TOGGLE_ON_BEHAVIOR = 'on';

/**
  @static
  @constant
  @type String
*/
SC.TOGGLE_OFF_BEHAVIOR = 'off';

/**
  @static
  @constant
  @type String
*/
SC.HOLD_BEHAVIOR = 'hold';

/** @class

  Implements a push-button-style button.  This class is used to implement
  both standard push buttons and tab-style controls.  See also SC.CheckboxView
  and SC.RadioView which are implemented as field views, but can also be
  treated as buttons.

  By default, a button uses the SC.Control mixin which will apply CSS
  classnames when the state of the button changes:

   - `active` -- when button is active
   - `sel` -- when button is toggled to a selected state

  @extends SC.View
  @extends SC.Control
  @since SproutCore 1.0
*/
SC.ButtonView = SC.View.extend(SC.Control,
/** @scope SC.ButtonView.prototype */ {

  /**
    Tied to the isEnabledInPane state

    @type Boolean
    @default YES
  */
  acceptsFirstResponder: function() {
    if (SC.FOCUS_ALL_CONTROLS) { return this.get('isEnabledInPane'); }
    return NO;
  }.property('isEnabledInPane'),

  /**
    @type Array
    @default ['sc-button-view']
    @see SC.View#classNames
  */
  classNames: ['sc-button-view'],

  /**
    Whether the title and toolTip will be escaped to avoid HTML injection attacks
    or not.

    You should only disable this option if you are sure you are displaying
    non-user generated text.

    Note: this is not an observed display property.  If you change it after
    rendering, you should call `displayDidChange` on the view to update the layer.

    @type Boolean
    @default true
   */
  escapeHTML: true,

  /**
    The theme to apply to the button. By default, a subtheme with the name of
    'square' is created for backwards-compatibility.

    @type String
    @default 'square'
  */
  themeName: 'square',


  // ..........................................................
  // Value Handling
  //

  /**
    Used to automatically update the state of the button view for toggle style
    buttons.

    For toggle style buttons, you can set the value and it will be used to
    update the isSelected state of the button view.  The value will also
    change as the user selects or deselects.  You can control which values
    the button will treat as `isSelected` by setting the `toggleOnValue` and
    `toggleOffValue`.  Alternatively, if you leave these properties set to
    `YES` or `NO`, the button will do its best to convert a value to an
    appropriate state:

     - `null`, `false`, `0` -- `isSelected = false`
     - any other single value -- `isSelected = true`
     - array -- if all values are the same state, that state; otherwise `MIXED`.

    @type Object
    @default null
  */
  value: null,

  /**
    Value of a selected toggle button.

    For a toggle button, set this to any object value you want. The button
    will be selected if the value property equals the targetValue. If the
    value is an array of multiple items that contains the targetValue, then
    the button will be set to a mixed state.

    default is YES

    @type Boolean|Object
    @default YES
  */
  toggleOnValue: YES,

  /**
    Value of an unselected toggle button.

    For a toggle button, set this to any object value you want.  When the
    user toggle's the button off, the value of the button will be set to this
    value.

    @type Boolean|Object
    @default NO
  */
  toggleOffValue: NO,


  // ..........................................................
  // Title Handling
  //

  /**
    If YES, then the title will be localized.

    @type Boolean
    @default NO
  */
  localize: NO,

  /** @private */
  localizeBindingDefault: SC.Binding.bool(),

  /**
    The button title.  If localize is `YES`, then this should be the
    localization key to display.  Otherwise, this will be the actual string
    displayed in the title.  This property is observable and bindable.

    @type String
    @default ""
  */
  title: "",

  /**
    If set, the title property will be updated automatically
    from the content using the key you specify.

    @type String
    @default null
  */
  contentTitleKey: null,

  /**
    The button icon. Set this to either a URL or a CSS class name (for
    spriting). Note that if you pass a URL, it must contain at
    least one slash to be detected as such.

    @type String
    @default null
  */
  icon: null,

  /**
    If you set this property, the icon will be updated automatically from the
    content using the key you specify.

    @type String
    @default null
  */
  contentIconKey: null,

  /**
    If YES, button will attempt to display an ellipsis if the title cannot
    fit inside of the visible area. This feature is not available on all
    browsers.

    Note: this is not an observed display property.  If you change it after
    rendering, you should call `displayDidChange` on the view to update the layer.

    @type Boolean
    @default YES
  */
  needsEllipsis: YES,

  /**
    This is generated by localizing the title property if necessary.

    @type String
    @observes 'title'
    @observes 'localize'
  */
  displayTitle: function() {
    var ret = this.get('title');
    return (ret && this.get('localize')) ? SC.String.loc(ret) : (ret || '');
  }.property('title','localize').cacheable(),

  /**
    The key equivalent that should trigger this button on the page.

    @type String
    @default null
  */
  keyEquivalent: null,


  // ..........................................................
  // BEHAVIOR
  //

  /**
    The behavioral mode of this button.

    Possible values are:

     - `SC.PUSH_BEHAVIOR` -- Pressing the button will trigger an action tied to the
       button. Does not change the value of the button.
     - `SC.TOGGLE_BEHAVIOR` -- Pressing the button will invert the current value of
       the button. If the button has a mixed value, it will be set to true.
     - `SC.TOGGLE_ON_BEHAVIOR` -- Pressing the button will set the current state to
       true no matter the previous value.
     - `SC.TOGGLE_OFF_BEHAVIOR` -- Pressing the button will set the current state to
       false no matter the previous value.
     - `SC.HOLD_BEHAVIOR` -- Pressing the button will cause the action to repeat at a
       regular interval specified by 'holdInterval'

    @type String
    @default SC.PUSH_BEHAVIOR
  */
  buttonBehavior: SC.PUSH_BEHAVIOR,

  /*
    If buttonBehavior is `SC.HOLD_BEHAVIOR`, this specifies, in milliseconds,
    how often to trigger the action. Ignored for other behaviors.

    @type Number
    @default 100
  */
  holdInterval: 100,

  /**
    If YES, then this button will be triggered when you hit return.

    This is the same as setting the `keyEquivalent` to 'return'.  This will also
    apply the "def" classname to the button.

    @type Boolean
    @default NO
  */
  isDefault: NO,
  isDefaultBindingDefault: SC.Binding.oneWay().bool(),

  /**
    If YES, then this button will be triggered when you hit escape.
    This is the same as setting the keyEquivalent to 'escape'.

    @type Boolean
    @default NO
  */
  isCancel: NO,
  isCancelBindingDefault: SC.Binding.oneWay().bool(),

  /**
    The name of the action you want triggered when the button is pressed.

    This property is used in conjunction with the target property to execute
    a method when a regular button is pressed.  These properties are not
    relevant when the button is used in toggle mode.

    If you do not set a target, then pressing a button will cause the
    responder chain to search for a view that implements the action you name
    here.  If you set a target, then the button will try to call the method
    on the target itself.

    For legacy support, you can also set the action property to a function.
    Doing so will cause the function itself to be called when the button is
    clicked.  It is generally better to use the target/action approach and
    to implement your code in a controller of some type.

    @type String
    @default null
  */
  action: null,

  /**
    The target object to invoke the action on when the button is pressed.

    If you set this target, the action will be called on the target object
    directly when the button is clicked.  If you leave this property set to
    null, then the button will search the responder chain for a view that
    implements the action when the button is pressed instead.

    @type Object
    @default null
  */
  target: null,

  /*
    TODO When is this property ever changed? Is this redundant with
    render delegates since it can now be turned on on a theme-by-theme
    basis? --TD
  */
  /**
    If YES, use a focus ring.

    @type Boolean
    @default NO
  */
  supportFocusRing: NO,

  // ..........................................................
  // Auto Resize Support
  //
  //
  // These properties are provided so that SC.AutoResize can be mixed in
  // to enable automatic resizing of the button.
  //

  /** @private */
  supportsAutoResize: YES,

  /*
    TODO get this from the render delegate so other elements may be used.
  */
  /** @private */
  autoResizeLayer: function() {
    var ret = this.invokeRenderDelegateMethod('getRenderedAutoResizeLayer', this.$());
    return ret || this.get('layer');
  }.property('layer').cacheable(),

  /** @private */
  autoResizeText: function() {
    return this.get('displayTitle');
  }.property('displayTitle').cacheable(),

  /**
    The padding to add to the measured size of the text to arrive at the measured
    size for the view.

    `SC.ButtonView` gets this from its render delegate, but if not supplied, defaults
    to 10.

    @default 10
    @type Number
  */
  autoResizePadding: SC.propertyFromRenderDelegate('autoResizePadding', 10),


  // TODO: What the hell is this? --TD
  _labelMinWidthIE7: 0,

  /**
    Called when the user presses a shortcut key, such as return or cancel,
    associated with this button.

    Highlights the button to show that it is being triggered, then, after a
    delay, performs the button's action.

    Does nothing if the button is disabled.

    @param {Event} evt
    @returns {Boolean} YES if successful, NO otherwise
  */
  triggerActionAfterDelay: function(evt) {
    // If this button is disabled, we have nothing to do
    if (!this.get('isEnabledInPane')) return NO;

    // Set active state of the button so it appears highlighted
    this.set('isActive', YES);

    // Invoke the actual action method after a small delay to give the user a
    // chance to see the highlight. This is especially important if the button
    // closes a pane, for example.
    this.invokeLater('triggerAction', 200, evt);
    return YES;
  },

  /** @private
    Called by triggerActionAfterDelay; this method actually
    performs the action and restores the button's state.

    @param {Event} evt
  */
  triggerAction: function(evt) {
    this._action(evt, YES);
    this.didTriggerAction();
    this.set('isActive', NO);
  },

  /**
    Callback called anytime the button's action is triggered.  You can
    implement this method in your own subclass to perform any cleanup needed
    after an action is performed.
  */
  didTriggerAction: function() {},


  // ................................................................
  // INTERNAL SUPPORT
  //

  /** @private - save keyEquivalent for later use */
  init: function() {
    arguments.callee.base.apply(this,arguments);

    var keyEquivalent = this.get('keyEquivalent');
    // Cache the key equivalent. The key equivalent is saved so that if,
    // for example, isDefault is changed from YES to NO, the old key
    // equivalent can be restored.
    if (keyEquivalent) {
      this._defaultKeyEquivalent = keyEquivalent;
    }

    // if value is not null, update isSelected to match value.  If value is
    // null, we assume you may be using isSelected only.
    if (!SC.none(this.get('value'))) this._button_valueDidChange();
  },

  /**
    The WAI-ARIA role of the button.

    @type String
    @default 'button'
    @readOnly
  */
  ariaRole: 'button',

  /**
    The following properties affect how `SC.ButtonView` is rendered, and will
    cause the view to be rerendered if they change.

    Note: 'value', 'isDefault', 'isCancel' are also display properties, but are
    observed separately.

    @type Array
    @default ['icon', 'displayTitle', 'displayToolTip', 'supportFocusRing', 'buttonBehavior']
  */
  displayProperties: ['icon', 'displayTitle', 'displayToolTip', 'supportFocusRing', 'buttonBehavior'],

  /**
    The name of the render delegate in the theme that should be used to
    render the button.

    In this case, the 'button' property will be retrieved from the theme and
    set to the render delegate of this view.

    @type String
    @default 'buttonRenderDelegate'
  */
  renderDelegateName: 'buttonRenderDelegate',

  contentKeys: {
    'contentValueKey': 'value',
    'contentTitleKey': 'title',
    'contentIconKey': 'icon'
  },

  /**
    Handle a key equivalent if set.  Trigger the default action for the
    button.  Depending on the implementation this may vary.

    @param {String} keystring
    @param {SC.Event} evt
    @returns {Boolean}  YES if handled, NO otherwise
  */
  performKeyEquivalent: function(keystring, evt) {
    //If this is not visible
    if (!this.get('isVisibleInWindow')) return NO;

    if (!this.get('isEnabledInPane')) return NO;
    var equiv = this.get('keyEquivalent');

    // button has defined a keyEquivalent and it matches!
    // if triggering succeeded, true will be returned and the operation will
    // be handled (i.e performKeyEquivalent will cease crawling the view
    // tree)
    if (equiv) {
      if (equiv === keystring) return this.triggerAction(evt);

    // should fire if isDefault OR isCancel.  This way if isDefault AND
    // isCancel, responds to both return and escape
    } else if ((this.get('isDefault') && (keystring === 'return')) ||
        (this.get('isCancel') && (keystring === 'escape'))) {
          return this.triggerAction(evt);
    }

    return NO; // did not handle it; keep searching
  },

  // ..........................................................
  // VALUE <-> isSelected STATE MANAGEMENT
  //

  /**
    This is the standard logic to compute a proposed isSelected state for a
    new value.  This takes into account the `toggleOnValue`/`toggleOffValue`
    properties, among other things.  It may return `YES`, `NO`, or
    `SC.MIXED_STATE`.

    @param {Object} value
    @returns {Boolean} return state
  */
  computeIsSelectedForValue: function(value) {
    var targetValue = this.get('toggleOnValue'), state, next ;

    if (SC.typeOf(value) === SC.T_ARRAY) {

      // treat a single item array like a single value
      if (value.length === 1) {
        state = (value[0] == targetValue) ;

      // for a multiple item array, check the states of all items.
      } else {
        state = null;
        value.find(function(x) {
          next = (x == targetValue) ;
          if (state === null) {
            state = next ;
          } else if (next !== state) state = SC.MIXED_STATE ;
          return state === SC.MIXED_STATE ; // stop when we hit a mixed state.
        });
      }

    // for single values, just compare to the toggleOnValue...use truthiness
    } else {
      if(value === SC.MIXED_STATE) state = SC.MIXED_STATE;
      else state = (value === targetValue) ;
    }
    return state ;
  },

  /** @private
    Whenever the button value changes, update the selected state to match.
  */
  _button_valueDidChange: function() {
    var value = this.get('value'),
        state = this.computeIsSelectedForValue(value);
    this.set('isSelected', state) ; // set new state...

    // value acts as a display property
    this.displayDidChange();
  }.observes('value'),

  /** @private
    Whenever the selected state is changed, make sure the button value is
    also updated.  Note that this may be called because the value has just
    changed.  In that case this should do nothing.
  */
  _button_isSelectedDidChange: function() {
    var newState = this.get('isSelected'),
        curState = this.computeIsSelectedForValue(this.get('value'));

    // fix up the value, but only if computed state does not match.
    // never fix up value if isSelected is set to MIXED_STATE since this can
    // only come from the value.
    if ((newState !== SC.MIXED_STATE) && (curState !== newState)) {
      var valueKey = (newState) ? 'toggleOnValue' : 'toggleOffValue' ;
      this.set('value', this.get(valueKey));
    }
  }.observes('isSelected'),


  /** @private
    Used to store the keyboard equivalent.

    Setting the isDefault property to YES, for example, will cause the
    `keyEquivalent` property to 'return'. This cached value is used to restore
    the `keyEquivalent` property if isDefault is set back to NO.

    @type String
  */
  _defaultKeyEquivalent: null,

  /** @private

    Whenever the isDefault or isCancel property changes, re-render and change
    the keyEquivalent property so that we respond to the return or escape key.
  */
  _isDefaultOrCancelDidChange: function() {
    var isDefault = !!this.get('isDefault'),
        isCancel = !isDefault && this.get('isCancel') ;

    if (isDefault) {
      this.set('keyEquivalent', 'return'); // change the key equivalent
    } else if (isCancel) {
      this.set('keyEquivalent', 'escape') ;
    } else {
      // Restore the default key equivalent
      this.set('keyEquivalent', this._defaultKeyEquivalent);
    }

    // isDefault and isCancel act as display properties
    this.displayDidChange();
  }.observes('isDefault', 'isCancel'),

  /** @private
    On mouse down, set active only if enabled.
  */
  mouseDown: function(evt) {
    var buttonBehavior = this.get('buttonBehavior');

    if (!this.get('isEnabledInPane')) return YES ; // handled event, but do nothing
    this.set('isActive', YES);
    this._isMouseDown = YES;

    if (buttonBehavior === SC.HOLD_BEHAVIOR) {
      this._action(evt);
    } else if (!this._isFocused && (buttonBehavior!==SC.PUSH_BEHAVIOR)) {
      this._isFocused = YES ;
      this.becomeFirstResponder();
    }

    return YES;
  },

  /** @private
    Remove the active class on mouseExited if mouse is down.
  */
  mouseExited: function(evt) {
    if (this._isMouseDown) {
      this.set('isActive', NO);
    }
    return YES;
  },

  /** @private
    If mouse was down and we renter the button area, set the active state again.
  */
  mouseEntered: function(evt) {
    if (this._isMouseDown) {
      this.set('isActive', YES);
    }
    return YES;
  },

  /** @private
    ON mouse up, trigger the action only if we are enabled and the mouse was released inside of the view.
  */
  mouseUp: function(evt) {
    if (this._isMouseDown) this.set('isActive', NO); // track independently in case isEnabledInPane has changed
    this._isMouseDown = false;

    if (this.get('buttonBehavior') !== SC.HOLD_BEHAVIOR) {
      var inside = this.$().within(evt.target);
      if (inside && this.get('isEnabledInPane')) this._action(evt) ;
    }

    return YES ;
  },

  /** @private */
  touchStart: function(touch){
    var buttonBehavior = this.get('buttonBehavior');

    if (!this.get('isEnabledInPane')) return YES ; // handled event, but do nothing
    this.set('isActive', YES);

    if (buttonBehavior === SC.HOLD_BEHAVIOR) {
      this._action(touch);
    } else if (!this._isFocused && (buttonBehavior!==SC.PUSH_BEHAVIOR)) {
      this._isFocused = YES ;
      this.becomeFirstResponder();
    }

    // don't want to do whatever default is...
    touch.preventDefault();

    return YES;
  },

  /** @private */
  touchesDragged: function(evt, touches) {
    if (!this.touchIsInBoundary(evt)) {
      if (!this._touch_exited) this.set('isActive', NO);
      this._touch_exited = YES;
    } else {
      if (this._touch_exited) this.set('isActive', YES);
      this._touch_exited = NO;
    }

    evt.preventDefault();
    return YES;
  },

  /** @private */
  touchEnd: function(touch){
    this._touch_exited = NO;
    this.set('isActive', NO); // track independently in case isEnabledInPane has changed

    if (this.get('buttonBehavior') !== SC.HOLD_BEHAVIOR) {
      if (this.touchIsInBoundary(touch) && this.get('isEnabledInPane')) {
        this._action();
      }
    }

    touch.preventDefault();
    return YES ;
  },

  /** @private */
  keyDown: function(evt) {
    // handle tab key
     if(!this.get('isEnabledInPane')) return YES;
    if (evt.which === 9 || evt.keyCode === 9) {
      var view = evt.shiftKey ? this.get('previousValidKeyView') : this.get('nextValidKeyView');
      if(view) view.becomeFirstResponder();
      else evt.allowDefault();
      return YES ; // handled
    }
    if (evt.which === 13 || evt.which === 32) {
      this.triggerActionAfterDelay(evt);
      return YES ; // handled
    }

    // let other keys through to browser
    evt.allowDefault();

    return NO;
  },

  /** @private
    Perform an action based on the behavior of the button.

     - toggle behavior: switch to on/off state
     - on behavior: turn on.
     - off behavior: turn off.
     - otherwise: invoke target/action
  */
  _action: function(evt, skipHoldRepeat) {
    switch(this.get('buttonBehavior')) {

    // When toggling, try to invert like values. i.e. 1 => 0, etc.
    case SC.TOGGLE_BEHAVIOR:
      var sel = this.get('isSelected') ;
      if (sel) {
        this.set('value', this.get('toggleOffValue')) ;
      } else {
        this.set('value', this.get('toggleOnValue')) ;
      }
      break ;

    // set value to on.  change 0 => 1.
    case SC.TOGGLE_ON_BEHAVIOR:
      this.set('value', this.get('toggleOnValue')) ;
      break ;

    // set the value to false. change 1 => 0
    case SC.TOGGLE_OFF_BEHAVIOR:
      this.set('value', this.get('toggleOffValue')) ;
      break ;

    case SC.HOLD_BEHAVIOR:
      this._runHoldAction(evt, skipHoldRepeat);
      break ;

    // otherwise, just trigger an action if there is one.
    default:
      //if (this.action) this.action(evt);
      this._runAction(evt);
    }
  },

  /** @private */
  _runAction: function(evt) {
    var action = this.get('action'),
        target = this.get('target') || null,
        rootResponder;

    if (action) {
      if (action && (SC.typeOf(action) === SC.T_FUNCTION)) {
        this.action(evt);
        return;
      } else {
        rootResponder = this.getPath('pane.rootResponder');
        if (rootResponder) {
          // newer action method + optional target syntax...
          rootResponder.sendAction(action, target, this, this.get('pane'), null, this);
        }
      }
    }
  },

  /** @private */
  _runHoldAction: function(evt, skipRepeat) {
    if (this.get('isActive')) {
      this._runAction();

      if (!skipRepeat) {
        // This run loop appears to only be necessary for testing
        SC.RunLoop.begin();
        this.invokeLater('_runHoldAction', this.get('holdInterval'), evt);
        SC.RunLoop.end();
      }
    }
  },


  /** @private */
  didBecomeKeyResponderFrom: function(keyView) {
    // focus the text field.
    if (!this._isFocused) {
      this._isFocused = YES ;
      this.becomeFirstResponder();
      if (this.get('isVisibleInWindow')) {
        this.$().focus();
      }
    }
  },

  /** @private */
  willLoseKeyResponderTo: function(responder) {
    if (this._isFocused) this._isFocused = NO ;
  },

  /** @private */
  didAppendToDocument: function() {
    if(SC.browser.isIE &&
        SC.browser.compare(SC.browser.version, '7') === 0 &&
        this.get('useStaticLayout')){
      var layout = this.get('layout'),
          elem = this.$(), w=0;
      if(elem && elem[0] && (w=elem[0].clientWidth) && w!==0 && this._labelMinWidthIE7===0){
        var label = this.$('.sc-button-label'),
            paddingRight = parseInt(label.css('paddingRight'),0),
            paddingLeft = parseInt(label.css('paddingLeft'),0),
            marginRight = parseInt(label.css('marginRight'),0),
            marginLeft = parseInt(label.css('marginLeft'),0);
        if(marginRight=='auto') SC.Logger.log(marginRight+","+marginLeft+","+paddingRight+","+paddingLeft);
        if(!paddingRight && isNaN(paddingRight)) paddingRight = 0;
        if(!paddingLeft && isNaN(paddingLeft)) paddingLeft = 0;
        if(!marginRight && isNaN(marginRight)) marginRight = 0;
        if(!marginLeft && isNaN(marginLeft)) marginLeft = 0;

        this._labelMinWidthIE7 = w-(paddingRight + paddingLeft)-(marginRight + marginLeft);
        label.css('minWidth', this._labelMinWidthIE7+'px');
      }else{
        this.invokeLater(this.didAppendToDocument, 1);
      }
    }
  }

}) ;



/**
  The delay after which "click" behavior should transition to "click and hold"
  behavior. This is used by subclasses such as PopupButtonView and
  SelectButtonView.

  @constant
  @type Number
*/
SC.ButtonView.CLICK_AND_HOLD_DELAY = SC.browser.isIE ? 600 : 300;

SC.REGULAR_BUTTON_HEIGHT=24;



/* >>>>>>>>>> BEGIN source/panes/alert.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('panes/panel');
sc_require('views/button');

/**
  Passed to delegate when alert pane is dismissed by pressing button 1

  @static
  @type String
  @default 'button1'
*/
SC.BUTTON1_STATUS = 'button1';

/**
  Passed to delegate when alert pane is dismissed by pressing button 2

  @static
  @type String
  @default 'button2'
*/
SC.BUTTON2_STATUS = 'button2';

/**
  Passed to delegate when alert pane is dismissed by pressing button 3

  @static
  @type String
  @default 'button3'
*/
SC.BUTTON3_STATUS = 'button3';

/** @class
  Displays a preformatted modal alert pane.

  Alert panes are a simple way to provide modal messaging that otherwise
  blocks the user's interaction with your application.  Alert panes are
  useful for showing important error messages and confirmation dialogs. They
  provide a better user experience than using the OS-level alert dialogs.

  ## Displaying an Alert Pane

  The easiest way to display an alert pane is to use one of the various
  class methods defined on `SC.AlertPane`, passing the message and an optional
  detailed description and caption.

  There are four variations of this method can you can invoke:

   - `warn()` -- displays an alert pane with a warning icon to the left.
   - `error()` -- displays an alert with an error icon to the left
   - `info()` -- displays an alert with an info icon to the left
   - `plain()` -- displays an alert w/o any icon
   - `show()` -- displays an alert with a customizable icon to the left

  In addition to passing a message, description and caption, you can also customize
  the title of the button 1 (OK) and add an optional button 2 and 3 (Cancel or Extra).

   - button1 -- 1st button from the right. default:OK
   - button2 -- 2nd button from the right. Optional. Could be Cancel or 2nd action.
   - button3 -- 1st button from the left. Optional. Could be Cancel or alternative option.

  Additionally, you can define a delegate object.  This delegate's
  `alertPaneDidDismiss()` method will be called when the pane
  is dismissed, passing the pane instance and a key indicating which
  button was pressed.

  ## Examples

  Show a simple AlertPane with an OK button:

      SC.AlertPane.warn({
        message: "Could not load calendar",
        description: "Your internet connection may be unavailable or our servers may be down.",
        caption: "Try again in a few minutes."
      });

  Show an AlertPane with a customized OK title (title will be 'Try Again') and
  custom action:

      SC.AlertPane.warn({
        message: "Could not load calendar",
        description: "Your internet connection may be unavailable or our servers may be down.",
        caption: "Try again in a few minutes.",
        buttons: [
          { title: "Try Again" }
        ]
      });

  Show an AlertPane with a custom OK, a Cancel button and an Extra button,
  each with custom titles.  Also, pass a delegate that will be invoked when
  the user's dismisses the dialog.

      MyApp.calendarController = SC.Object.create({
        alertPaneDidDismiss: function(pane, status) {
          switch(status) {
            case SC.BUTTON1_STATUS:
              this.tryAgain();
              break;

            case SC.BUTTON2_STATUS:
              // do nothing
              break;

            case SC.BUTTON3_STATUS:
              this.showMoreInfo();
              break;
          }
        },
        ...
      });


      SC.AlertPane.warn({
        message: "Could not load calendar",
        description: "Your internet connection may be unavailable or our servers may be down.",
        caption: "Try again in a few minutes.",
        delegate: MyApp.calendarController,
        buttons: [
          { title: "Try Again" },
          { title: "Cancel" },
          { title: "More Info…" }
        ]
      });

  Instead of using the delegate pattern above, you can also specify a target
  and an action, similar to SC.ButtonView.

      SC.AlertPane.warn({
        message: "Could not load calendar",
        description: "Your internet connection may be unavailable or our servers may be down.",
        caption: "Try again in a few minutes.",
        buttons: [
          {
            title: "OK",
            action: "didClickOK",
            target: MyApp.calendarController
          }
        ]
      });

  Also note that in addition to passing the action as a string of the method
  name that will be invoked, you can also give a function reference as the
  action.


  @extends SC.PanelPane
  @since SproutCore 1.0
*/
SC.AlertPane = SC.PanelPane.extend(
/** @scope SC.AlertPane.prototype */{

  /**
    @type Array
    @default ['sc-alert']
    @see SC.View#classNames
  */
  classNames: ['sc-alert'],

  /**
    The WAI-ARIA role for alert pane.

    @type String
    @default 'alertdialog'
    @constant
  */
  ariaRole: 'alertdialog',

  /**
    If defined, the delegate is notified when the pane is dismissed. If you have
    set specific button actions, they will be called on the delegate object

    The method to be called on your delegate will be:

        alertPaneDidDismiss: function(pane, status) {}

    The status will be one of `SC.BUTTON1_STATUS`, `SC.BUTTON2_STATUS` or `SC.BUTTON3_STATUS`
    depending on which button was clicked.

    @type Object
    @default null
  */
  delegate: null,

  /**
    The icon URL or class name. If you do not set this, an alert icon will
    be shown instead.

    @type String
    @default 'sc-icon-alert-48'
  */
  icon: 'sc-icon-alert-48',

  /**
    The primary message to display. This message will appear in large bold
    type at the top of the alert.

    @type String
    @default ""
  */
  message: "",

  /**
    The ARIA label for the alert is the message, by default.

    @field {String}
  */
  ariaLabel: function() {
    return this.get('message');
  }.property('message').cacheable(),

  /**
    An optional detailed description. Use this string to provide further
    explanation of the condition and, optionally, ways the user can resolve
    the problem.

    @type String
    @default ""
  */
  description: "",

  /**
    An escaped and formatted version of the description property.

    @field
    @type String
    @observes description
  */
  displayDescription: function() {
    var desc = this.get('description');
    if (!desc || desc.length === 0) return desc ;

    desc = SC.RenderContext.escapeHTML(desc); // remove HTML
    return '<p class="description">' + desc.split('\n').join('</p><p class="description">') + '</p>';
  }.property('description').cacheable(),

  /**
    An optional detailed caption. Use this string to provide further
    fine print explanation of the condition and, optionally, ways the user can resolve
    the problem.

    @type String
    @default ""
  */
  caption: "",

  /**
    An escaped and formatted version of the caption property.

    @field
    @type String
    @observes caption
  */
  displayCaption: function() {
    var caption = this.get('caption');
    if (!caption || caption.length === 0) return caption ;

    caption = SC.RenderContext.escapeHTML(caption); // remove HTML
    return '<p class="caption">' + caption.split('\n').join('</p><p class="caption">') + '</p>';
  }.property('caption').cacheable(),

  /**
    The button view for button 1 (OK).

    @type SC.ButtonView
  */
  button1: SC.outlet('contentView.childViews.1.childViews.1'),

  /**
    The button view for the button 2 (Cancel).

    @type SC.ButtonView
  */
  button2: SC.outlet('contentView.childViews.1.childViews.0'),

  /**
    The button view for the button 3 (Extra).

    @type SC.ButtonView
  */
  button3: SC.outlet('contentView.childViews.2.childViews.0'),

  /**
    The view for the button 3 (Extra) wrapper.

    @type SC.View
  */
  buttonThreeWrapper: SC.outlet('contentView.childViews.2'),

  /**
    @type Hash
    @default { top : 0.3, centerX: 0, width: 500 }
    @see SC.View#layout
  */
  layout: { top : 0.3, centerX: 0, width: 500 },

  /** @private - internal view that is actually displayed */
  contentView: SC.View.extend({

    useStaticLayout: YES,

    layout: { left: 0, right: 0, top: 0, height: "auto" },

    childViews: [
      SC.View.extend({
        classNames: ['info'],
        useStaticLayout: YES,

        /** @private */
        render: function(context, firstTime) {
          var pane = this.get('pane');
          if(pane.get('icon') == 'blank') context.addClass('plain');
          context.push('<img src="'+SC.BLANK_IMAGE_URL+'" class="icon '+pane.get('icon')+'" />');
          context.begin('h1').addClass('header').text(pane.get('message') || '').end();
          context.push(pane.get('displayDescription') || '');
          context.push(pane.get('displayCaption') || '');
          context.push('<div class="separator"></div>');

        }
      }),

      SC.View.extend({
        layout: { bottom: 13, height: 24, right: 18, width: 466 },
        childViews: ['cancelButton', 'okButton'],
        classNames: ['text-align-right'],

        cancelButton: SC.ButtonView.extend({
          useStaticLayout: YES,
          actionKey: SC.BUTTON2_STATUS,
          localize: YES,
          layout: { right: 5, height: 'auto', width: 'auto', bottom: 0 },
          isCancel: YES,
          action: "dismiss",
          isVisible: NO
        }),

        okButton: SC.ButtonView.extend({
          useStaticLayout: YES,
          actionKey: SC.BUTTON1_STATUS,
          localize: YES,
          layout: { left: 0, height: 'auto', width: 'auto', bottom: 0 },
          isDefault: YES,
          action: "dismiss",
          isVisible: NO
        })
      }),

      SC.View.extend({
        layout: { bottom: 13, height: 24, left: 18, width: 150 },
        childViews: [
          SC.ButtonView.extend({
            useStaticLayout: YES,
            actionKey: SC.BUTTON3_STATUS,
            localize: YES,
            layout: { left: 0, height: 'auto', width: 'auto', bottom: 0 },
            action: "dismiss",
            isVisible: NO
          })]
      })]
  }),

  /**
    Action triggered whenever any button is pressed. Also the hides the
    alertpane itself.

    This will trigger the following chain of events:

     1. If a delegate was given, and it has alertPaneDidDismiss it will be called
     2. Otherwise it will look for the action of the button and call:
      a) The action function reference if one was given
      b) The action method on the target if one was given
      c) If both a and b are missing, call the action on the rootResponder

    @param {SC.View} sender - the button view that was clicked
  */
  dismiss: function(sender) {
    var del = this.delegate,
        rootResponder, action, target;

    if (del && del.alertPaneDidDismiss) {
      del.alertPaneDidDismiss(this, sender.get('actionKey'));
    }

    if (action = (sender && sender.get('customAction'))) {
      if (SC.typeOf(action) === SC.T_FUNCTION) {
        action.call(action);
      } else {
        rootResponder = this.getPath('pane.rootResponder');
        if(rootResponder) {
          target = sender.get('customTarget');
          rootResponder.sendAction(action, target || del, this, this, null, this);
        }
      }
    }

    this.remove(); // hide alert
  },

  /** @private
    Executes whenever one of the icon, message, description or caption is changed.
    This simply causes the UI to refresh.
  */
  alertInfoDidChange: function() {
    var v = this.getPath('contentView.childViews.0');
    if (v) v.displayDidChange(); // re-render message
  }.observes('icon', 'message', 'displayDescription', 'displayCaption')

});

SC.AlertPane.mixin(
/** @scope SC.AlertPane */{

  /**
    Show a dialog with a given set of hash attributes:

        SC.AlertPane.show({
          message: "Could not load calendar",
          description: "Your internet connection may be unavailable or our servers may be down.",
          caption: "Try again in a few minutes.",
          delegate: MyApp.calendarController
        });

    See more examples for how to configure buttons and individual actions in the
    documentation for the `SC.AlertPane` class.

    @param {Hash} args
    @return {SC.AlertPane} the pane shown
  */
  show: function(args) {
    // normalize the arguments if this is a deprecated call
    args = SC.AlertPane._argumentsCall.apply(this, arguments);

    var pane = this.create(args),
        idx = 0,
        buttons = args.buttons,
        buttonView, title, action, target, themeName;

    if(buttons) {
      buttons.forEach(function(button) {
        idx++;
        if(!button) return;
        buttonView = pane.get('button%@'.fmt(idx));

        title = button.title;
        action = button.action;
        target = button.target;
        themeName = args.themeName || 'capsule';

        buttonView.set('title'.fmt(idx), title);
        if(action) buttonView.set('customAction'.fmt(idx), action);
        if(target) buttonView.set('customTarget'.fmt(idx), target);
        buttonView.set('isVisible', !!title);
        buttonView.set('themeName', themeName);
      });
    } else {
      // if there are no buttons defined, just add the standard OK button
      buttonView = pane.get('button1');
      buttonView.set('title', "OK");
      buttonView.set('isVisible', YES);
    }

    var show = pane.append(); // make visible.
    pane.adjust('height', pane.childViews[0].$().height());
    pane.updateLayout();
    return show;
  },

  /**
    Same as `show()` just that it uses sc-icon-alert-48 CSS classname
    as the dialog icon

    @param {Hash} args
    @return {SC.AlertPane} the pane shown
  */
  warn: function(args) {
    // normalize the arguments if this is a deprecated call
    args = SC.AlertPane._argumentsCall.apply(this, arguments);

    args.icon = 'sc-icon-alert-48';
    return this.show(args);
  },

  /**
    Same as `show()` just that it uses sc-icon-info-48 CSS classname
    as the dialog icon

    @param {Hash} args
    @return {SC.AlertPane} the pane shown
  */
  info: function(args) {
    // normalize the arguments if this is a deprecated call
    args = SC.AlertPane._argumentsCall.apply(this, arguments);

    args.icon = 'sc-icon-info-48';
    return this.show(args);
  },

  /**
    Same as `show()` just that it uses sc-icon-error-48 CSS classname
    as the dialog icon

    @param {Hash} args
    @return {SC.AlertPane} the pane shown
  */
  error: function(args) {
    // normalize the arguments if this is a deprecated call
    args = SC.AlertPane._argumentsCall.apply(this, arguments);

    args.icon = 'sc-icon-error-48';
    return this.show(args);
  },

  /**
    Same as `show()` just that it uses blank CSS classname
    as the dialog icon

    @param {Hash} args
    @return {SC.AlertPane} the pane shown
  */
  plain: function(args) {
    // normalize the arguments if this is a deprecated call
    args = SC.AlertPane._argumentsCall.apply(this, arguments);

    args.icon = 'blank';
    return this.show(args);
  },

  /** @private
    Set properties to new structure for call that use the old arguments
    structure.

    Deprecated API but is preserved for now for backwards compatibility.

    @deprecated
  */
  _argumentsCall: function(args) {
    var ret = args;
    if(SC.typeOf(args)!==SC.T_HASH) {
      
      SC.debug('SC.AlertPane has changed the signatures for show(), info(), warn(), error() and plain(). Please update accordingly.');
      
      var normalizedArgs = this._normalizeArguments(arguments);

      // now convert it to the new format for show()
      ret = {
        message: normalizedArgs[0],
        description: normalizedArgs[1],
        caption: normalizedArgs[2],
        delegate: normalizedArgs[7],
        icon: (normalizedArgs[6] || 'sc-icon-alert-48'),
        themeName: 'capsule'
      };

      // set buttons if there are any (and check if it's a string, since last
      // argument could be the delegate object)
      if(SC.typeOf(normalizedArgs[3])===SC.T_STRING || SC.typeOf(normalizedArgs[4])===SC.T_STRING || SC.typeOf(normalizedArgs[5])===SC.T_STRING) {
        ret.buttons = [
          { title: normalizedArgs[3] },
          { title: normalizedArgs[4] },
          { title: normalizedArgs[5] }
        ];
      }

    }
    return ret;
  },

  /** @private
    internal method normalizes arguments for processing by helper methods.
  */
  _normalizeArguments: function(args) {
    args = SC.A(args); // convert to real array
    var len = args.length, delegate = args[len-1];
    if (SC.typeOf(delegate) !== SC.T_STRING) {
      args[len-1] = null;
    } else delegate = null ;
    args[7] = delegate ;
    return args ;
  }

});

/* >>>>>>>>>> BEGIN source/panes/palette.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('panes/panel');

/** @class
  Displays a non-modal, default positioned, drag&drop-able palette pane.

  The default way to use the palette pane is to simply add it to your page like this:

      SC.PalettePane.create({
        layout: { width: 400, height: 200, right: 0, top: 0 },
        contentView: SC.View.extend({
        })
      }).append();

  This will cause your palette pane to display.

  Palette pane is a simple way to provide non-modal messaging that won't
  blocks the user's interaction with your application.  Palette panes are
  useful for showing important detail information with flexible position.
  They provide a better user experience than modal panel.

  @extends SC.PanelPane
  @since SproutCore 1.0
*/
SC.PalettePane = SC.PanelPane.extend(
/** @scope SC.PalettePane.prototype */ {

  /**
    @type Array
    @default ['sc-palette']
    @see SC.View#classNames
  */
  classNames: ['sc-palette'],

  /**
    Palettes are not modal by default

    @type Boolean
    @default NO
  */
  isModal: NO,

  /**
    @type SC.View
    @default SC.ModalPane
  */
  modalPane: SC.ModalPane,
  
  /**
    @type Boolean
    @default NO
  */
  isAnchored: NO,

  /** @private */
  _mouseOffsetX: null,

  /** @private */
  _mouseOffsetY: null,

  /** @private
    Drag & drop palette to new position.
  */
  mouseDown: function(evt) {
    var f=this.get('frame');
    this._mouseOffsetX = f ? (f.x - evt.pageX) : 0;
    this._mouseOffsetY = f ? (f.y - evt.pageY) : 0;
    return YES;
  },

  /** @private */
  mouseDragged: function(evt) {
    if(!this.isAnchored) {
      this.set('layout', { width: this.layout.width, height: this.layout.height, left: this._mouseOffsetX + evt.pageX, top: this._mouseOffsetY + evt.pageY });
      this.updateLayout();
    }
    return YES;
  },

  /** @private */
  touchStart: function(evt){
    return this.mouseDown(evt);
  },

  /** @private */
  touchesDragged: function(evt){
    return this.mouseDragged(evt);
  }

});

/* >>>>>>>>>> BEGIN source/panes/picker.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('panes/palette');

/**
  Popular customized picker position rules:
  default: initiated just below the anchor.
           shift x, y to optimized picker visibility and make sure top-left corner is always visible.
  menu :   same as default rule +
           default(1, 4, 3) or custom offset below the anchor for default location to fine tuned visual alignment +
           enforce min left(7px)/right(8px) padding to the window
  fixed :  default(1, 4, 3) or custom offset below the anchor for default location to cope with specific anchor and skip fitPositionToScreen
  pointer :take default [0, 1, 2, 3, 2] or custom matrix to choose one of four perfect pointer positions.Ex:
           perfect right (0) > perfect left (1) > perfect top (2) > perfect bottom (3)
           fallback to perfect top (2)
  menu-pointer :take default [3, 0, 1, 2, 3] or custom matrix to choose one of four perfect pointer positions.Ex:
          perfect bottom (3) > perfect right (0) > perfect left (1) > perfect top (2)
          fallback to perfect bottom (3)
*/

/**
  @type String
  @constant
  @static
*/
SC.PICKER_MENU = 'menu';

/**
  @type String
  @constant
  @static
*/
SC.PICKER_FIXED = 'fixed';

/**
  @type String
  @constant
  @static
*/
SC.PICKER_POINTER = 'pointer';

/**
  @type String
  @constant
  @static
*/
SC.PICKER_MENU_POINTER = 'menu-pointer';

/**
  Pointer layout for perfect right/left/top/bottom.

  @constant
  @static
*/
SC.POINTER_LAYOUT = ["perfectRight", "perfectLeft", "perfectTop", "perfectBottom"];

/**
  @class

  Display a non-modal pane that automatically repositions around a view so as
  to remain visible.

  An `SC.PickerPane` repositions around the view to which it is anchored as the
  browser window is resized so as to ensure the pane's content remains visible.
  A picker pane is useful for displaying supplementary information and does not
  block the user's interaction with other UI elements. Picker panes typically
  provide a better user experience than modal panels.

  An `SC.PickerPane` repositions itself according to the optional `preferMatrix`
  argument passed in the `.popup()` method call. The `preferMatrix` either
  specifies an offset-based arrangement behavior or a position-based arrangement
  behavior depending on the `preferType` argument in the `.popup()` call.

  The simplest way to create and display a picker pane:

      SC.PickerPane.create({
        layout: { width: 400, height: 200 },
        contentView: SC.View.extend({})
      }).popup(someView);

  This displays the `SC.PickerPane` anchored to `someView`.

  ## Positioning

  Picker pane positioning can be classified into two broad categories:
  offset-based and position-based.

  ### Offset-based

  When `preferType` is unspecified, `SC.PICKER_MENU` or `SC.PICKER_FIXED`, then
  the `preferMatrix` array describes the offset that is used to position the
  pane below the anchor. The offset is described by an array of three values,
  defaulting to `[1, 4, 3]`. The first value controls the x offset and the second
  value the y offset. The third value can be `0` (right) or `3` (bottom),
  controlling whether the origin of the pane is further offset by the width
  (in the case of 0) or the height (in the case of 3) of the anchor.

  ### Position-based

  When `preferType` is `SC.PICKER_POINTER` or `SC.PICKER_MENU_POINTER`, then
  the `preferMatrix` specifies the sides in the order in which you want the
  `SC.PickerPane` to try to arrange itself around the view to which it is
  anchored. The fifth element in the `preferMatrix` specifies which side the
  `SC.PickerPane` should display on when there isn't enough space around any
  of the preferred sides.

  Anchor sides are defined by their index in `SC.POINTER_LAYOUT`, where right
  is `0`, left is `1`, top is `2`, and bottom is `3`.

  For example, the `preferMatrix` of `[3, 0, 1, 2, 2]` says: "Display below the
  anchor (3); if there isn't enough space then display to the right of the anchor (0).
  If there isn't enough space either below or to the right of the anchor, then appear
  to the left (1), unless there is also no space on the left, in which case display
  above the anchor (2)."

  ## Position Rules

  When invoking `.popup()` you can optionally specify a picker position rule with
  the `preferType` argument.

  If no `preferType` is specified, the picker pane is displayed just below the anchor.
  The pane will reposition automatically for optimal visibility, ensuring the top-left
  corner is visible.

  These position rules have the following behaviors:

  ### `SC.PICKER_MENU`

  Positioning is offset-based, with `preferMatrix` defaulting to `[1, 4, 3]`.
  Furthermore, a minimum left and right padding to window, of 7px and 8px, respectively,
  is enforced.


  ### `SC.PICKER_FIXED`

  Positioning is offset-based, with `preferMatrix` defaulting to `[1, 4, 3]` and
  skipping `fitPositionToScreen`.


  ### `SC.PICKER_POINTER`

  Positioning is position-based, with `preferMatrix` defaulting to `[0, 1, 2, 3, 2]`,
  i.e. right > left > top > bottom; fallback to top.


  ### `SC.PICKER_MENU_POINTER`

  Positioning is position-based, with `preferMatrix` defaulting to `[3, 0, 1, 2, 3]`,
  i.e. bottom, right, left, top; fallback to bottom.



  ## Examples

  Examples for applying popular customized picker position rules:

  ### default:

      SC.PickerPane.create({
        layout: { width: 400, height: 200 },
        contentView: SC.View.extend({})
      }).popup(anchor);

  ### menu below the anchor with default `preferMatrix` of `[1, 4, 3]`:

      SC.PickerPane.create({
        layout: { width: 400, height: 200 },
        contentView: SC.View.extend({})
      }).popup(anchor, SC.PICKER_MENU);

  ### menu on the right side of anchor with custom `preferMatrix` of `[2, 6, 0]`:

      SC.PickerPane.create({
        layout: { width: 400, height: 200 },
        contentView: SC.View.extend({})
      }).popup(anchor, SC.PICKER_MENU, [2, 6, 0]);

  ### fixed below the anchor with default `preferMatrix` of `[1, 4, 3]`:

      SC.PickerPane.create({
        layout: { width: 400, height: 200 },
        contentView: SC.View.extend({})
      }).popup(anchor, SC.PICKER_FIXED);

  ### fixed on the right side of anchor with `preferMatrix` of `[-22,-17, 0]`:

      SC.PickerPane.create({
        layout: { width: 400, height: 200 },
        contentView: SC.View.extend({})
      }).popup(anchor, SC.PICKER_FIXED, [-22,-17, 0]);

  ### pointer with default `preferMatrix` of `[0, 1, 2, 3, 2]`:

      SC.PickerPane.create({
        layout: { width: 400, height: 200 },
        contentView: SC.View.extend({})
      }).popup(anchor, SC.PICKER_POINTER);

  Positioning: right (0) > left (1) > top (2) > bottom (3). Fallback to top (2).

  ### pointer with custom `preferMatrix` of `[3, 0, 1, 2, 2]`:

      SC.PickerPane.create({
        layout: { width: 400, height: 200 },
        contentView: SC.View.extend({})
      }).popup(anchor, SC.PICKER_POINTER, [3, 0, 1, 2, 2]);

  Positioning: bottom (3) > right (0) > left (1) > top (2). Fallback to top (2).

  ### menu-pointer with default `preferMatrix` of `[3, 0, 1, 2, 3]`:

      SC.PickerPane.create({
        layout: { width: 400, height: 200 },
        contentView: SC.View.extend({})
      }).popup(anchor, SC.PICKER_MENU_POINTER);

  Positioning: bottom (3) > right (0) > left (1) > top (2). Fallback to bottom (3).

  @extends SC.PalettePane
  @since SproutCore 1.0
*/
SC.PickerPane = SC.PalettePane.extend(
/** @scope SC.PickerPane.prototype */ {

  /**
    @type Array
    @default ['sc-picker']
    @see SC.View#classNames
  */
  classNames: ['sc-picker'],

  /**
    @type Boolean
    @default YES
  */
  isAnchored: YES,

  /**
    @type Boolean
    @default YES
  */
  isModal: YES,

  /** @private
    @type String
    @default 'perfectRight'
  */
  pointerPos: 'perfectRight',

  /** @private
    @type Number
    @default 0
  */
  pointerPosX: 0,

  /** @private
    @type Number
    @default 0
  */
  pointerPosY: 0,

  /** @private
    This property will be set to the element (or view.get('layer')) that
    triggered your picker to show.  You can use this to properly position your
    picker.

    @type HTMLElement
    @default null
  */
  anchorElement: function (key, value) {
    var anchorView;

    if (value === undefined) {
      // Getting the value.
      anchorView = this._anchorView;
      return anchorView ? anchorView.get('layer') : this._anchorHTMLElement;
    } else {
      // Setting the value.
      if (!value) {
        throw "You must set 'anchorElement' to either a view or a DOM element";
      }
      else if (value.isView) {
        this._anchorView        = value;
        this._anchorHTMLElement = null;
      }
      else {
        this._anchorView        = null;
        this._anchorHTMLElement = value;
      }

      return value;
    }
  }.property('layer').cacheable(),

  /** @private
    anchor rect calculated by computeAnchorRect from init popup

    @type Hash
    @default null
  */
  anchorCached: null,

  /**
    popular customized picker position rule

    @type String
    @default null
  */
  preferType: null,

  /**
    default/custom offset or position pref matrix for specific preferType

    @type String
    @default null
  */
  preferMatrix: null,

  /**
    default/custom offset of pointer for picker-pointer or pointer-menu

    @type Array
    @default null
  */
  pointerOffset: null,

  /** @deprecated Version 1.10.  Use windowPadding instead.
    default offset of extra-right pointer for picker-pointer or pointer-menu

    @type Number
    @default 0
  */
  extraRightOffset: function () {
    
    SC.warn('SC.PickerPane#extraRightOffset is deprecated.  The pointer will position itself automatically.');
    

    return this.get('windowPadding');
  }.property('windowPadding').cacheable(),

  /**
    The target object to invoke the remove action on when the user clicks off the
    picker that is to be removed.

    If you set this target, the action will be called on the target object
    directly when the user clicks off the picker. If you leave this property
    set to null, then the button will search the responder chain for a view that
    implements the action when the button is pressed instead.

    @type Object
    @default null
  */
  removeTarget: null,

  /**
    The name of the action you want triggered when the user clicks off the
    picker pane that is to be removed.

    This property is used in conjunction with the removeTarget property to execute
    a method when the user clicks off the picker pane.

    If you do not set a target, then clicking off the picker pane will cause the
    responder chain to search for a view that implements the action you name
    here, if one was provided.

    Note that this property is optional. If no explicit value is provided then the
    picker pane will perform the default action which is to simply remove itself.

    @type String
    @default null
  */
  removeAction: null,


  /**
    Disable repositioning as the window or size changes. It stays in the original
    popup position.

    @type Boolean
    @default NO
  */
  repositionOnWindowResize: YES,


  /** @private
    Default padding around the window's edge that the pane will not overlap.

    This value is set to the value of SC.PickerPane.WINDOW_PADDING, except when
    using preferType of SC.PICKER_MENU_POINTER, where it will be set according
    to the `controlSize` value of the pane to one of:

      SC.PickerPane.TINY_MENU_WINDOW_PADDING
      SC.PickerPane.SMALL_MENU_WINDOW_PADDING
      SC.PickerPane.REGULAR_MENU_WINDOW_PADDING
      SC.PickerPane.LARGE_MENU_WINDOW_PADDING
      SC.PickerPane.HUGE_MENU_WINDOW_PADDING

    @type Number
    @default SC.PickerPane.WINDOW_PADDING
  */
  windowPadding: null,

  /* @private Observe the frame for changes so that we can reposition if necessary. */
  borderFrameDidChange: function () {
    this.positionPane(true);
  },

  /**
    Displays a new picker pane.

    @param {SC.View|HTMLElement} anchorViewOrElement view or element to anchor to
    @param {String} [preferType] apply picker position rule
    @param {Array} [preferMatrix] apply custom offset or position pref matrix for specific preferType
    @param {Number} [pointerOffset]
    @returns {SC.PickerPane} receiver
  */
  popup: function (anchorViewOrElement, preferType, preferMatrix, pointerOffset) {
    if (anchorViewOrElement) {
      if (anchorViewOrElement.isView) {
        this._anchorView = anchorViewOrElement;
        this._setupScrollObservers(anchorViewOrElement);
      } else {
        this._anchorHTMLElement = anchorViewOrElement;
      }
    }
    this.beginPropertyChanges();
    if (preferType) { this.set('preferType', preferType); }
    if (preferMatrix) { this.set('preferMatrix', preferMatrix); }
    if (pointerOffset) { this.set('pointerOffset', pointerOffset); }
    this.endPropertyChanges();
    this.positionPane();
    this._hideOverflow();

    // Start observing the frame for changes.
    this.addObserver('borderFrame', this.borderFrameDidChange);

    return this.append();
  },

  /** @private
    The ideal position for a picker pane is just below the anchor that
    triggered it + offset of specific preferType. Find that ideal position,
    then call fitPositionToScreen to get final position. If anchor is missing,
    fallback to center.
  */
  positionPane: function (useAnchorCached) {
    useAnchorCached = useAnchorCached && this.get('anchorCached');

    var anchor       = useAnchorCached ? this.get('anchorCached') : this.get('anchorElement'),
      frame        = this.get('borderFrame'),
      preferType   = this.get('preferType'),
      preferMatrix = this.get('preferMatrix'),
      layout       = this.get('layout'),
      origin;

    // usually an anchorElement will be passed.  The ideal position is just
    // below the anchor + default or custom offset according to preferType.
    // If that is not possible, fitPositionToScreen will take care of that for
    // other alternative and fallback position.

    if (anchor) {
      if (!useAnchorCached) {
        anchor = this.computeAnchorRect(anchor);
        this.set('anchorCached', anchor);
      }

      origin = SC.cloneRect(anchor);

      if (preferType) {
        switch (preferType) {
        case SC.PICKER_MENU:
        case SC.PICKER_FIXED:
          if (!preferMatrix || preferMatrix.length !== 3) {
            // default below the anchor with fine-tuned visual alignment
            // for Menu to appear just below the anchorElement.
            this.set('preferMatrix', [1, 4, 3]);
          }

          // fine-tuned visual alignment from preferMatrix
          origin.x += ((this.preferMatrix[2] === 0) ? origin.width : 0) + this.preferMatrix[0];
          origin.y += ((this.preferMatrix[2] === 3) ? origin.height : 0) + this.preferMatrix[1];
          break;
        default:
          origin.y += origin.height;
          break;
        }
      } else {
        origin.y += origin.height;
      }

      // Since we repeatedly need to know the half-width and half-height of the
      // frames, add those properties.
      anchor.halfWidth = parseInt(anchor.width * 0.5, 0);
      anchor.halfHeight = parseInt(anchor.height * 0.5, 0);
      frame.halfWidth = parseInt(frame.width * 0.5, 0);
      frame.halfHeight = parseInt(frame.height * 0.5, 0);

      origin = this.fitPositionToScreen(origin, frame, anchor);
      this.adjust({
        width: origin.width,
        height: origin.height,
        left: origin.x,
        top: origin.y
      });
    // if no anchor view has been set for some reason, just center.
    } else {
      this.adjust({
        width: layout.width,
        height: layout.height,
        centerX: 0,
        centerY: 0
      });
    }
    this.updateLayout();

    return this;
  },

  /** @private
    This method will return ret (x, y, width, height) from a rectangular element
    Notice: temp hack for calculating visible anchor height by counting height
    up to window bottom only. We do have 'clippingFrame' supported from view.
    But since our anchor can be element, we use this solution for now.
  */
  computeAnchorRect: function (anchor) {
    var bounding, ret, cq,
        wsize = SC.RootResponder.responder.computeWindowSize();
    // Some browsers natively implement getBoundingClientRect, so if it's
    // available we'll use it for speed.
    if (anchor.getBoundingClientRect) {
      // Webkit and Firefox 3.5 will get everything they need by
      // calling getBoundingClientRect()
      bounding = anchor.getBoundingClientRect();
      ret = {
        x:      bounding.left,
        y:      bounding.top,
        width:  bounding.width,
        height: bounding.height
      };
      // If width and height are undefined this means we are in IE or FF < 3.5
      // if we did not get the frame dimensions the do the calculations
      // based on an element
      if (ret.width === undefined || ret.height === undefined) {
        cq = SC.$(anchor);
        ret.width = cq.outerWidth();
        ret.height = cq.outerHeight();
      }
    } else {
      // Only really old versions will have to go through this code path.
      ret   = SC.offset(anchor); // get x & y
      cq    = SC.$(anchor);
      ret.width = cq.outerWidth();
      ret.height = cq.outerHeight();
    }
    ret.height = (wsize.height - ret.y) < ret.height ? (wsize.height - ret.y) : ret.height;

    if (!SC.browser.isIE && window.scrollX > 0 || window.scrollY > 0) {
      ret.x += window.scrollX;
      ret.y += window.scrollY;
    } else if (SC.browser.isIE && (document.documentElement.scrollTop > 0 || document.documentElement.scrollLeft > 0)) {
      ret.x += document.documentElement.scrollLeft;
      ret.y += document.documentElement.scrollTop;
    }
    return ret;
  },

  /** @private
    This method will dispatch to the right re-position rule according to preferType
  */
  fitPositionToScreen: function (preferredPosition, picker, anchor) {
    var wsize = SC.RootResponder.responder.computeWindowSize(),
        wret = { x: 0, y: 0, width: wsize.width, height: wsize.height };

    // if window size is smaller than the minimum size of app, use minimum size.
    var mainPane = SC.RootResponder.responder.mainPane;
    if (mainPane) {
      var minWidth = mainPane.layout.minWidth,
          minHeight = mainPane.layout.minHeight;

      if (minWidth && wret.width < minWidth) {
        wret.width = mainPane.layout.minWidth;
      }

      if (minHeight && wret.height < minHeight) {
        wret.height = mainPane.layout.minHeight;
      }
    }

    picker.x = preferredPosition.x;
    picker.y = preferredPosition.y;

    if (this.preferType) {
      switch (this.preferType) {
      case SC.PICKER_MENU:
        // apply menu re-position rule
        picker = this.fitPositionToScreenMenu(wret, picker, this.get('isSubMenu'));
        break;
      case SC.PICKER_MENU_POINTER:
        this.setupPointer(anchor);
        picker = this.fitPositionToScreenMenuPointer(wret, picker, anchor);
        break;
      case SC.PICKER_POINTER:
        // apply pointer re-position rule
        this.setupPointer(anchor);
        picker = this.fitPositionToScreenPointer(wret, picker, anchor);
        break;
      case SC.PICKER_FIXED:
        // skip fitPositionToScreen
        break;
      default:
        break;
      }
    } else {
      // apply default re-position rule
      picker = this.fitPositionToScreenDefault(wret, picker, anchor);
    }
    // this.displayDidChange();
    return picker;
  },

  /** @private
    re-position rule migrated from old SC.OverlayPaneView.
    shift x, y to optimized picker visibility and make sure top-left corner is always visible.
  */
  fitPositionToScreenDefault: function (w, f, a) {
    var mx;

    // make sure the right edge fits on the screen.  If not, anchor to
    // right edge of anchor or right edge of window, whichever is closer.
    if (SC.maxX(f) > w.width) {
      mx = Math.max(SC.maxX(a), f.width);
      f.x = Math.min(mx, w.width) - f.width;
    }

    // if the left edge is off of the screen, try to position at left edge
    // of anchor.  If that pushes right edge off screen, shift back until
    // right is on screen or left = 0
    if (SC.minX(f) < 0) {
      f.x = SC.minX(Math.max(a, 0));
      if (SC.maxX(f) > w.width) {
        f.x = Math.max(0, w.width - f.width);
      }
    }

    // make sure bottom edge fits on screen.  If not, try to anchor to top
    // of anchor or bottom edge of screen.
    if (SC.maxY(f) > w.height) {
      mx = Math.max((a.y - f.height), 0);
      if (mx > w.height) {
        f.y = Math.max(0, w.height - f.height);
      } else { f.y = mx; }
    }

    // if Top edge is off screen, try to anchor to bottom of anchor. If that
    // pushes off bottom edge, shift up until it is back on screen or top =0
    if (SC.minY(f) < 0) {
      mx = Math.min(SC.maxY(a), (w.height - a.height));
      f.y = Math.max(mx, 0);
    }
    return f;
  },

  /** @private
    Reposition the pane in a way that is optimized for menus.

    Specifically, we want to ensure that the pane is at least 7 pixels from
    the left side of the screen, and 20 pixels from the right side.

    If the menu is a submenu, we also want to reposition the pane to the left
    of the parent menu if it would otherwise exceed the width of the viewport.
  */
  fitPositionToScreenMenu: function (windowFrame, paneFrame, subMenu) {
    // Set up init location for submenu
    if (subMenu) {
      paneFrame.x -= this.get('submenuOffsetX');
      paneFrame.y -= Math.floor(this.get('menuHeightPadding') / 2);
    }

    // If the right edge of the pane is within 20 pixels of the right edge
    // of the window, we need to reposition it.
    if ((paneFrame.x + paneFrame.width) > (windowFrame.width - 20)) {
      if (subMenu) {
        // Submenus should be re-anchored to the left of the parent menu
        paneFrame.x = paneFrame.x - (paneFrame.width * 2);
      } else {
        // Otherwise, just position the pane 20 pixels from the right edge
        paneFrame.x = windowFrame.width - paneFrame.width - 20;
      }
    }

    // Make sure we are at least 7 pixels from the left edge of the screen.
    if (paneFrame.x < 7) { paneFrame.x = 7; }

    if (paneFrame.y < 7) {
      paneFrame.height += paneFrame.y;
      paneFrame.y = 7;
    }

    // If the height of the menu is bigger than the window height, resize it.
    if (paneFrame.height + paneFrame.y + 35 >= windowFrame.height) {
      if (paneFrame.height + 50 >= windowFrame.height) {
        paneFrame.y = SC.MenuPane.VERTICAL_OFFSET;
        paneFrame.height = windowFrame.height - (SC.MenuPane.VERTICAL_OFFSET * 2);
      } else {
        paneFrame.y += (windowFrame.height - (paneFrame.height + paneFrame.y + 35));
      }
    }

    return paneFrame;
  },

  /** @private
    Reposition the pane in a way that is optimized for menus that have a
    point element.

    This simply calls fitPositionToScreenPointer, then ensures that the menu
    does not exceed the height of the viewport.

    @returns {Rect}
  */
  fitPositionToScreenMenuPointer: function (w, f, a) {
    f = this.fitPositionToScreenPointer(w, f, a);

    // If the height of the menu is bigger than the window height, resize it.
    if (f.height + f.y + 35 >= w.height) {
      f.height = w.height - f.y - (SC.MenuPane.VERTICAL_OFFSET * 2);
    }

    return f;
  },

  /** @private
    re-position rule for triangle pointer picker.
  */
  fitPositionToScreenPointer: function (w, f, a) {
    var curType,
        deltas,
        matrix = this.preferMatrix,
        offset = this.pointerOffset,
        topLefts, botRights,
        windowPadding = this.get('windowPadding');

    // Determine the top-left corner of each of the 4 perfectly positioned
    // frames, while taking the pointer offset into account.
    topLefts = [
      // Top left [x, y] if positioned evenly to the right of the anchor
      [a.x + a.width + offset[0], a.y + a.halfHeight - f.halfHeight],

      // Top left [x, y] if positioned evenly to the left of the anchor
      [a.x - f.width + offset[1], a.y + a.halfHeight - f.halfHeight],

      // Top left [x, y] if positioned evenly above the anchor
      [a.x + a.halfWidth - f.halfWidth, a.y - f.height + offset[2]],

      // Top left [x, y] if positioned evenly below the anchor
      [a.x + a.halfWidth - f.halfWidth, a.y + a.height + offset[3]]
    ];

    // Determine the bottom-right corner of each of the 4 perfectly positioned
    // frames, while taking the pointer offset into account.
    botRights = [
      // Bottom right [x, y] if positioned evenly to the right of the anchor
      [a.x + a.width + f.width + offset[0], a.y + a.halfHeight + f.halfHeight],

      // Bottom right [x, y] if positioned evenly to the left of the anchor
      [a.x + offset[1], a.y + a.halfHeight + f.halfHeight],

      // Bottom right [x, y] if positioned evenly above the anchor
      [a.x + a.halfWidth + f.halfWidth, a.y + offset[2]],

      // Bottom right [x, y] if positioned evenly below the anchor
      [a.x + a.halfWidth + f.halfWidth, a.y + a.height + f.height + offset[3]]
    ];

    // Loop through the preferred matrix, hopefully finding one that will fit
    // perfectly.
    for (var i = 0, pointerLen = SC.POINTER_LAYOUT.length; i < pointerLen; i++) {
      // The current preferred side.
      curType = matrix[i];

      // Determine if any of the sides of the pane would go beyond the window's
      // edge for each of the 4 perfectly positioned frames; taking the amount
      // of windowPadding into account.  This is done by measuring the distance
      // from each side of the frame to the side of the window.  If the distance
      // is negative then the edge is overlapping.
      //
      // If a perfect position has no overlapping edges, then it is a viable
      // option for positioning.
      deltas = {
        top: topLefts[curType][1] - windowPadding,
        right: w.width - windowPadding - botRights[curType][0],
        bottom: w.height - windowPadding - botRights[curType][1],
        left: topLefts[curType][0] - windowPadding
      };

      // UNUSED.  It would be nice to get the picker as close as possible.
      // Cache the fallback deltas.
      // if (curType === matrix[4]) {
      //   fallbackDeltas = deltas;
      // }

      // If no edges overflow, then use this layout.
      if (deltas.top >= 0 &&
          deltas.right >= 0 &&
          deltas.bottom >= 0 &&
          deltas.left >= 0) {

        f.x = topLefts[curType][0];
        f.y = topLefts[curType][1];

        this.set('pointerPosX', 0);
        this.set('pointerPosY', 0);
        this.set('pointerPos', SC.POINTER_LAYOUT[curType]);

        break;

      // If we prefer right or left and can fit right or left respectively, but
      // can't fit the top within the window top and padding, then check if by
      // adjusting the top of the pane down if it would still be beside the
      // anchor and still above the bottom of the window with padding.
      } else if (((curType === 0 && deltas.right >= 0) || // Right fits for preferred right
                 (curType === 1 &&  deltas.left >= 0)) && // or left fits for preferred left,
                 deltas.top < 0 && // but top doesn't fit,
                 deltas.top + f.halfHeight >= 0) {  // yet it could.

        // Adjust the pane position by the amount of downward shifting.
        f.x = topLefts[curType][0];
        f.y = topLefts[curType][1] - deltas.top;

        // Offset the pointer position by the opposite amount of downward
        // shifting (minus half the height of the pointer).
        this.set('pointerPosX', 0);
        this.set('pointerPosY', deltas.top);
        this.set('pointerPos', SC.POINTER_LAYOUT[curType]);
        break;

      // If we prefer right or left and can fit right or left respectively, but
      // can't fit the bottom within the window bottom and padding, then check
      // if by adjusting the top of the pane up if it would still be beside the
      // anchor and still below the top of the window with padding.
      } else if (((curType === 0 && deltas.right >= 0) || // Right fits for preferred right
                 (curType === 1 &&  deltas.left >= 0)) && // or left fits for preferred left,
                 deltas.bottom < 0 && // but bottom doesn't fit,
                 deltas.bottom + f.halfHeight >= 0) {  // yet it could.

        // Adjust the pane position by the amount of upward shifting.
        f.x = topLefts[curType][0];
        f.y = topLefts[curType][1] + deltas.bottom;

        // Offset the pointer position by the opposite amount of upward
        // shifting (minus half the height of the pointer).
        this.set('pointerPosX', 0);
        this.set('pointerPosY', Math.abs(deltas.bottom));
        this.set('pointerPos', SC.POINTER_LAYOUT[curType]);
        break;

      // If we prefer top or bottom and can fit top or bottom respectively, but
      // can't fit the right side within the window right side plus padding,
      // then check if by adjusting the pane leftwards to fit if it would still
      // be beside the anchor and still fit within the left side of the window
      // with padding.
      } else if (((curType === 2 && deltas.top >= 0) || // Top fits for preferred top
                 (curType === 3 &&  deltas.bottom >= 0)) && // or bottom fits for preferred bottom,
                 deltas.right < 0 && // but right doesn't fit,
                 deltas.right + f.halfWidth >= 0) {  // yet it could.

        // Adjust the pane position by the amount of leftward shifting.
        f.x = topLefts[curType][0] + deltas.right;
        f.y = topLefts[curType][1];

        // Offset the pointer position by the opposite amount of leftward
        // shifting (minus half the width of the pointer).
        this.set('pointerPosX', Math.abs(deltas.right));
        this.set('pointerPosY', 0);
        this.set('pointerPos', SC.POINTER_LAYOUT[curType]);
        break;

      // If we prefer top or bottom and can fit top or bottom respectively, but
      // can't fit the left side within the window left side plus padding,
      // then check if by adjusting the pane rightwards to fit if it would still
      // be beside the anchor and still fit within the right side of the window
      // with padding.
      } else if (((curType === 2 && deltas.top >= 0) || // Top fits for preferred top
                 (curType === 3 &&  deltas.bottom >= 0)) && // or bottom fits for preferred bottom,
                 deltas.left < 0 && // but left doesn't fit,
                 deltas.left + f.halfWidth >= 0) {  // yet it could.

        // Adjust the pane position by the amount of leftward shifting.
        f.x = topLefts[curType][0] - deltas.left;
        f.y = topLefts[curType][1];

        // Offset the pointer position by the opposite amount of leftward
        // shifting (minus half the width of the pointer).
        this.set('pointerPosX', deltas.left);
        this.set('pointerPosY', 0);
        this.set('pointerPos', SC.POINTER_LAYOUT[curType]);
        break;
      }

    }

    // If no arrangement was found to fit, then use the fall back preferred
    // type.
    if (i === pointerLen) {
      if (matrix[4] === -1) {
        //f.x = a.x > 0 ? a.x + 23 : 0; // another alternative align to left
        f.x = a.x + a.halfWidth;
        f.y = a.y + a.halfHeight - f.halfHeight;

        this.set('pointerPos', SC.POINTER_LAYOUT[0] + ' fallback');
        this.set('pointerPosY', f.halfHeight - 40);
      } else {
        f.x = topLefts[matrix[4]][0];
        f.y = topLefts[matrix[4]][1];

        this.set('pointerPos', SC.POINTER_LAYOUT[matrix[4]]);
        this.set('pointerPosY', 0);
      }

      this.set('pointerPosX', 0);
    }

    this.invokeLast(this._adjustPointerPosition);

    return f;
  },

  /** @private Measure the pointer element and adjust it by the determined offset. */
  _adjustPointerPosition: function () {
    var pointer = this.$('.sc-pointer'),
      pointerPos = this.get('pointerPos'),
      marginLeft,
      marginTop;

    switch (pointerPos) {
    case 'perfectRight':
    case 'perfectLeft':
      marginTop = -Math.round(pointer.outerHeight() / 2);
      marginTop += this.get('pointerPosY');
      pointer.attr('style', "margin-top: " + marginTop + "px");
      break;
    case 'perfectTop':
    case 'perfectBottom':
      marginLeft = -Math.round(pointer.outerWidth() / 2);
      marginLeft += this.get('pointerPosX');
      pointer.attr('style', "margin-left: " + marginLeft + "px;");
      break;
    }
  },

  /** @private
    This method will set up pointerOffset and preferMatrix according to type
    and size if not provided explicitly.
  */
  setupPointer: function (a) {
    var pointerOffset = this.pointerOffset,
        K             = SC.PickerPane;

    // set up pointerOffset according to type and size if not provided explicitly
    if (!pointerOffset || pointerOffset.length !== 4) {
      if (this.get('preferType') == SC.PICKER_MENU_POINTER) {
        switch (this.get('controlSize')) {
        case SC.TINY_CONTROL_SIZE:
          this.set('pointerOffset', K.TINY_PICKER_MENU_POINTER_OFFSET);
          this.set('windowPadding', K.TINY_MENU_WINDOW_PADDING);
          break;
        case SC.SMALL_CONTROL_SIZE:
          this.set('pointerOffset', K.SMALL_PICKER_MENU_POINTER_OFFSET);
          this.set('windowPadding', K.SMALL_MENU_WINDOW_PADDING);
          break;
        case SC.REGULAR_CONTROL_SIZE:
          this.set('pointerOffset', K.REGULAR_PICKER_MENU_POINTER_OFFSET);
          this.set('windowPadding', K.REGULAR_MENU_WINDOW_PADDING);
          break;
        case SC.LARGE_CONTROL_SIZE:
          this.set('pointerOffset', K.LARGE_PICKER_MENU_POINTER_OFFSET);
          this.set('windowPadding', K.LARGE_MENU_WINDOW_PADDING);
          break;
        case SC.HUGE_CONTROL_SIZE:
          this.set('pointerOffset', K.HUGE_PICKER_MENU_POINTER_OFFSET);
          this.set('windowPadding', K.HUGE_MENU_WINDOW_PADDING);
          break;
        default:
          this.set('pointerOffset', K.REGULAR_PICKER_MENU_POINTER_OFFSET);
          this.set('windowPadding', K.REGULAR_MENU_WINDOW_PADDING);
          
          SC.warn('SC.PickerPane with preferType of SC.PICKER_MENU_POINTER should either define a controlSize or provide a pointerOffset. SC.PickerPane will fall back to default pointerOffset of SC.PickerPane.REGULAR_PICKER_MENU_POINTER_OFFSET and default windowPadding of SC.PickerPane.WINDOW_PADDING');
          
        }
      } else {
        var overlapTuningX = (a.width < 16)  ? ((a.width < 4)  ? 9 : 6) : 0,
            overlapTuningY = (a.height < 16) ? ((a.height < 4) ? 9 : 6) : 0,
            offsetKey      = K.PICKER_POINTER_OFFSET;

        var offset = [offsetKey[0] + overlapTuningX,
                      offsetKey[1] - overlapTuningX,
                      offsetKey[2] - overlapTuningY,
                      offsetKey[3] + overlapTuningY];

        this.set('pointerOffset', offset);
        // TODO: What to do about this?
        if (SC.none(this.get('windowPadding'))) {
          this.set('windowPadding', K.WINDOW_PADDING);
        }
      }
    } else {
      // TODO: What to do about this?
      if (SC.none(this.get('windowPadding'))) {
        this.set('windowPadding', K.WINDOW_PADDING);
      }
    }

    // set up preferMatrix according to type if not provided explicitly:
    // take default [0, 1, 2, 3, 2] for picker, [3, 0, 1, 2, 3] for menu picker if
    // custom matrix not provided explicitly
    if (!this.preferMatrix || this.preferMatrix.length !== 5) {
      // menu-picker default re-position rule :
      // perfect bottom (3) > perfect right (0) > perfect left (1) > perfect top (2)
      // fallback to perfect bottom (3)
      // picker default re-position rule :
      // perfect right (0) > perfect left (1) > perfect top (2) > perfect bottom (3)
      // fallback to perfect top (2)
      this.set('preferMatrix', this.get('preferType') === SC.PICKER_MENU_POINTER ? [3, 2, 1, 0, 3] : [0, 1, 2, 3, 2]);
    }
  },

  /**
    @type Array
    @default ['pointerPos']
    @see SC.View#displayProperties
  */
  displayProperties: ['pointerPos'],

  /**
    @type String
    @default 'pickerRenderDelegate'
  */
  renderDelegateName: 'pickerRenderDelegate',

  /** @private - click away picker. */
  modalPaneDidClick: function (evt) {
    var f = this.get('frame'),
        target = this.get('removeTarget') || null,
        action = this.get('removeAction'),
        rootResponder = this.get('rootResponder');

    if (!this.clickInside(f, evt)) {
      // We're not in the Pane so we must be in the modal
      if (action) {
        rootResponder.sendAction(action, target, this, this, null, this);
      } else {
        this.remove();
      }

      return YES;
    }

    return NO;
  },

  /** @private */
  mouseDown: function (evt) {
    return this.modalPaneDidClick(evt);
  },

  /** @private
    internal method to define the range for clicking inside so the picker
    won't be clicked away default is the range of contentView frame.
    Over-write for adjustments. ex: shadow
  */
  clickInside: function (frame, evt) {
    return SC.pointInRect({ x: evt.pageX, y: evt.pageY }, frame);
  },

  /**
    Invoked by the root responder. Re-position picker whenever the window resizes.
  */
  windowSizeDidChange: function (oldSize, newSize) {
    arguments.callee.base.apply(this,arguments);

    if (this.repositionOnWindowResize) { this.positionPane(); }
  },

  remove: function () {
    if (this.get('isVisibleInWindow') && this.get('isPaneAttached')) {
      this._withdrawOverflowRequest();
    }
    this._removeScrollObservers();

    // Stop observing the frame for changes.
    this.removeObserver('borderFrame', this.borderFrameDidChange);

    return arguments.callee.base.apply(this,arguments);
  },

  /** @private
    Internal method to hide the overflow on the body to make sure we don't
    show scrollbars when the picker has shadows, as it's really annoying.
  */
  _hideOverflow: function () {
    var main = SC.$('.sc-main'),
        minWidth = parseInt(main.css('minWidth'), 0),
        minHeight = parseInt(main.css('minHeight'), 0),
        windowSize = SC.RootResponder.responder.get('currentWindowSize');

    if (windowSize.width >= minWidth && windowSize.height >= minHeight) {
      SC.bodyOverflowArbitrator.requestHidden(this);
    }
  },

  /** @private
    Internal method to show the overflow on the body to make sure we don't
    show scrollbars when the picker has shadows, as it's really annoying.
  */
  _withdrawOverflowRequest: function () {
    SC.bodyOverflowArbitrator.withdrawRequest(this);
  },

  /** @private
    Detect if view is inside a scroll view. Do this by traversing parent view
    hierarchy until you hit a scroll view or main pane.
  */
  _getScrollViewOfView: function (view) {
    var curLevel = view;
    while (curLevel) {
      if (curLevel.isScrollable) {
        break;
      }

      curLevel = curLevel.get('parentView');
    }

    return curLevel;
  },

  /** @private
    If anchor view is in a scroll view, setup observers on scroll offsets.
  */
  _setupScrollObservers: function (anchorView) {
    var scrollView = this._getScrollViewOfView(anchorView);
    if (scrollView) {
      scrollView.addObserver('horizontalScrollOffset', this, this._scrollOffsetDidChange);
      scrollView.addObserver('verticalScrollOffset', this, this._scrollOffsetDidChange);
      this._scrollView = scrollView;
    }
  },

  /** @private
    Teardown observers setup in _setupScrollObservers.
  */
  _removeScrollObservers: function () {
    var scrollView = this._scrollView;
    if (scrollView) {
      scrollView.removeObserver('horizontalScrollOffset', this, this._scrollOffsetDidChange);
      scrollView.removeObserver('verticalScrollOffset', this, this._scrollOffsetDidChange);
    }
  },

  /** @private
    Reposition pane whenever scroll offsets change.
  */
  _scrollOffsetDidChange: function () {
    this.positionPane();
  }
});

/**
  Default metrics for the different control sizes.
*/

/** @static */
SC.PickerPane.WINDOW_PADDING = 20;

/** @static */
SC.PickerPane.TINY_MENU_WINDOW_PADDING = 12;

/** @static */
SC.PickerPane.SMALL_MENU_WINDOW_PADDING = 11;

/** @static */
SC.PickerPane.REGULAR_MENU_WINDOW_PADDING = 12;

/** @static */
SC.PickerPane.LARGE_MENU_WINDOW_PADDING = 17;

/** @static */
SC.PickerPane.HUGE_MENU_WINDOW_PADDING = 12;

/** @deprecated Version 1.10.  Use SC.PickerPane.WINDOW_PADDING.
  @static
*/
SC.PickerPane.PICKER_EXTRA_RIGHT_OFFSET = 20;

/** @deprecated Version 1.10.  Use SC.PickerPane.TINY_MENU_WINDOW_PADDING.
  @static
*/
SC.PickerPane.TINY_PICKER_MENU_EXTRA_RIGHT_OFFSET = 12;

/** @deprecated Version 1.10.  Use SC.PickerPane.SMALL_MENU_WINDOW_PADDING.
  @static
*/
SC.PickerPane.SMALL_PICKER_MENU_EXTRA_RIGHT_OFFSET = 11;

/** @deprecated Version 1.10.  Use SC.PickerPane.REGULAR_MENU_WINDOW_PADDING.
  @static
*/
SC.PickerPane.REGULAR_PICKER_MENU_EXTRA_RIGHT_OFFSET = 12;

/** @deprecated Version 1.10.  Use SC.PickerPane.LARGE_MENU_WINDOW_PADDING.
  @static
*/
SC.PickerPane.LARGE_PICKER_MENU_EXTRA_RIGHT_OFFSET = 17;

/** @deprecated Version 1.10.  Use SC.PickerPane.HUGE_MENU_WINDOW_PADDING.
  @static
*/
SC.PickerPane.HUGE_PICKER_MENU_EXTRA_RIGHT_OFFSET = 12;

/**
  @static
*/
SC.PickerPane.PICKER_POINTER_OFFSET = [9, -9, -18, 18];

/**
  @static
*/
SC.PickerPane.TINY_PICKER_MENU_POINTER_OFFSET = [9, -9, -18, 18];

/**
  @static
*/
SC.PickerPane.SMALL_PICKER_MENU_POINTER_OFFSET = [9, -9, -8, 8];

/**
  @static
*/
SC.PickerPane.REGULAR_PICKER_MENU_POINTER_OFFSET = [9, -9, -12, 12];

/**
  @static
*/
SC.PickerPane.LARGE_PICKER_MENU_POINTER_OFFSET = [9, -9, -16, 16];

/**
  @static
*/
SC.PickerPane.HUGE_PICKER_MENU_POINTER_OFFSET = [9, -9, -18, 18];

/* >>>>>>>>>> BEGIN source/views/separator.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


/**
  @class

  Displays a horizontal or vertical separator line.  Simply create one of 
  these views and configure the layout direction and layout frame.
  
  @extends SC.View
  @since SproutCore 1.0
*/
SC.SeparatorView = SC.View.extend(
/** @scope SC.SeparatorView.prototype */ {

  /**
    @type Array
    @default ['sc-separator-view']
    @see SC.View#classNames
  */
  classNames: ['sc-separator-view'],
  
  /**
    @type String
    @default 'span'
    @see SC.View#tagName
  */
  tagName: 'span',

  /** 
    Select the direction of the separator line. Possible values:
    
      - SC.LAYOUT_VERTICAL
      - SC.LAYOUT_HORIZONTAL
    
    @type String
    @default SC.LAYOUT_HORIZONTAL
  */
  layoutDirection: SC.LAYOUT_HORIZONTAL,

  /** @private */
  render: function(context, firstTime) {
    if(firstTime) context.push('<span></span>');
    context.addClass(this.get('layoutDirection'));
  }

});

/* >>>>>>>>>> BEGIN source/views/menu_item.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('views/button');
sc_require('views/separator');

/**
  @class

  An SC.MenuItemView is created for every item in a menu.

  @extends SC.ButtonView
  @since SproutCore 1.0
*/
SC.MenuItemView = SC.View.extend(SC.ContentDisplay,
/** @scope SC.MenuItemView.prototype */ {

  /**
    @type Array
    @default ['sc-menu-item']
    @see SC.View#classNames
  */
  classNames: ['sc-menu-item'],

  /**
    @type Array
    @default ['title', 'isEnabled', 'isSeparator', 'isChecked']
    @see SC.View#displayProperties
  */
  displayProperties: ['title', 'isEnabled', 'isSeparator', 'isChecked'],


  /**
    The WAI-ARIA role for menu items.

    @type String
    @default 'menuitem'
    @readOnly
  */
  ariaRole: 'menuitem',

  /**
    @type Boolean
    @default YES
  */
  escapeHTML: YES,

  /**
    @type Boolean
    @default YES
  */
  acceptsFirstResponder: YES,

  /**
    IE only attribute to block blurring of other controls

    @type Boolean
    @default YES
  */
  blocksIEDeactivate: YES,

  /**
    @type Boolean
    @default NO
  */
  isContextMenuEnabled: NO,


  // ..........................................................
  // KEY PROPERTIES
  //

  /**
    The content object the menu view will display.

    @type Object
    @default null
  */
  content: null,

  /**
    YES if this menu item represents a separator, NO otherwise.

    @field
    @type Boolean
    @observes content
  */
  isSeparator: function () {
    return this.getContentProperty('itemSeparatorKey') === YES;
  }.property('content').cacheable(),

  /**
    @field
    @type Boolean
    @observes content.isEnabled
  */
  isEnabled: function () {
    return this.getContentProperty('itemIsEnabledKey') !== NO &&
           this.getContentProperty('itemSeparatorKey') !== YES;
  }.property('content.isEnabled').cacheable(),

  /**
    YES if the menu item should include a check next to it.

    @type Boolean
    @property
  */
  isChecked: function () {
    return this.getContentProperty('itemCheckboxKey');
  }.property(),

  /**
    This menu item's submenu, if it exists.

    @field
    @type SC.MenuView
    @observes content
  */
  subMenu: function () {
    var content = this.get('content'), menuItems, parentMenu;

    if (!content) return null;

    parentMenu = this.get('parentMenu');
    menuItems = content.get(parentMenu.itemSubMenuKey);
    if (menuItems) {
      if (SC.kindOf(menuItems, SC.MenuPane)) {
        menuItems.set('isModal', NO);
        menuItems.set('isSubMenu', YES);
        menuItems.set('parentMenu', parentMenu);
        return menuItems;
      } else {
        return SC.MenuPane.create({
          layout: { width: 200 },
          items: menuItems,
          isModal: NO,
          isSubMenu: YES,
          parentMenu: parentMenu,
          controlSize: parentMenu.get('controlSize'),
          exampleView: parentMenu.get('exampleView')
        });
      }
    }

    return null;
  }.property('content').cacheable(),

  /**
    @type Boolean
    @default NO
    @observes subMenu
  */
  hasSubMenu: function () {
    return !!this.get('subMenu');
  }.property('subMenu').cacheable(),

  /** @private */
  init: function () {
    arguments.callee.base.apply(this,arguments);
    this.contentDidChange();
  },

  /** SC.MenuItemView is not able to update itself in place at this time. */
  // TODO: add update: support.
  isReusable: false,

  /** @private
    Fills the passed html-array with strings that can be joined to form the
    innerHTML of the receiver element.  Also populates an array of classNames
    to set on the outer element.

    @param {SC.RenderContext} context
    @param {Boolean} firstTime
    @returns {void}
  */
  render: function (context) {
    var content = this.get('content'),
        val,
        menu = this.get('parentMenu'),
        itemWidth = this.get('itemWidth') || menu.layout.width,
        itemHeight = this.get('itemHeight') || SC.DEFAULT_MENU_ITEM_HEIGHT;

    this.set('itemWidth', itemWidth);
    this.set('itemHeight', itemHeight);

    //addressing accessibility
    if (this.get('isSeparator')) {
      //assign the role of separator
      context.setAttr('role', 'separator');
    } else if (this.get('isChecked')) {
      //assign the role of menuitemcheckbox
      context.setAttr('role', 'menuitemcheckbox');
      context.setAttr('aria-checked', true);
    }

    context = context.begin('a').addClass('menu-item');

    if (this.get('isSeparator')) {
      context.push('<span class="separator"></span>');
      context.addClass('disabled');
    } else {
      val = content.get(menu.itemIconKey);
      if (val) {
        this.renderImage(context, val);
        context.addClass('has-icon');
      }

      val = this.get('title');
      if (SC.typeOf(val) !== SC.T_STRING) val = val.toString();
      this.renderLabel(context, val);

      if (this.get('isChecked')) {
        context.push('<div class="checkbox"></div>');
      }

      if (this.get('hasSubMenu')) {
        this.renderBranch(context);
      }

      val = this.getContentProperty('itemShortCutKey');
      if (val) {
        this.renderShortcut(context, val);
      }
    }

    context = context.end();
  },

  /** @private
   Generates the image used to represent the image icon. override this to
   return your own custom HTML

   @param {SC.RenderContext} context the render context
   @param {String} the source path of the image
   @returns {void}
  */
  renderImage: function (context, image) {
    // get a class name and url to include if relevant

    var url, className;
    if (image && SC.ImageView.valueIsUrl(image)) {
      url = image;
      className = '';
    } else {
      className = image;
      url = SC.BLANK_IMAGE_URL;
    }
    // generate the img element...
    context.begin('img').addClass('image').addClass(className).setAttr('src', url).end();
  },

  /** @private
   Generates the label used to represent the menu item. override this to
   return your own custom HTML

   @param {SC.RenderContext} context the render context
   @param {String} menu item name
   @returns {void}
  */

  renderLabel: function (context, label) {
    if (this.get('escapeHTML')) {
      label = SC.RenderContext.escapeHTML(label);
    }
    context.push("<span class='value ellipsis'>" + label + "</span>");
  },

  /** @private
   Generates the string used to represent the branch arrow. override this to
   return your own custom HTML

   @param {SC.RenderContext} context the render context
   @returns {void}
  */
  renderBranch: function (context) {
    context.push('<span class="has-branch"></span>');
  },

  /** @private
   Generates the string used to represent the short cut keys. override this to
   return your own custom HTML

   @param {SC.RenderContext} context the render context
   @param {String} the shortcut key string to be displayed with menu item name
   @returns {void}
  */
  renderShortcut: function (context, shortcut) {
    context.push('<span class = "shortcut">' + shortcut + '</span>');
  },

  /**
    This method will check whether the current Menu Item is still
    selected and then create a submenu accordingly.
  */
  showSubMenu: function () {
    var subMenu = this.get('subMenu');
    if (subMenu) {
      subMenu.set('mouseHasEntered', NO);
      subMenu.popup(this, [0, 0, 0]);
    }

    this._subMenuTimer = null;
  },

  /**
    The title from the content property.

    @field
    @type String
    @observes content.title
  */
  title: function () {
    var ret = this.getContentProperty('itemTitleKey'),
        localize = this.getPath('parentMenu.localize');

    if (localize && ret) ret = SC.String.loc(ret);

    return ret || '';
  }.property('content.title').cacheable(),

  /** @private */
  getContentProperty: function (property) {
    var content = this.get('content'),
        menu = this.get('parentMenu');

    if (content) {
      return content.get(menu.get(property));
    }
  },


  //..........................................
  // Mouse Events Handling
  //

  /** @private */
  mouseUp: function (evt) {
    // SproutCore's event system will deliver the mouseUp event to the view
    // that got the mouseDown event, but for menus we want to track the mouse,
    // so we'll do our own dispatching.
    var targetMenuItem;

    targetMenuItem = this.getPath('parentMenu.rootMenu.targetMenuItem');

    if (targetMenuItem) targetMenuItem.performAction();
    return YES;
  },

  /** @private
    Called on mouse down to send the action to the target.

    This method will start flashing the menu item to indicate to the user that
    their selection has been received, unless disableMenuFlash has been set to
    YES on the menu item.

    @returns {Boolean}
  */
  performAction: function () {
    // Clicking on a disabled menu item should close the menu.
    if (!this.get('isEnabled')) {
      this.getPath('parentMenu.rootMenu').remove();
      return YES;
    }

    // Menus that contain submenus should ignore clicks
    if (this.get('hasSubMenu')) return NO;

    var disableFlash = this.getContentProperty('itemDisableMenuFlashKey'),
        menu;

    if (disableFlash) {
      // Menu flashing has been disabled for this menu item, so perform
      // the action immediately.
      this.sendAction();
    } else {
      // Flash the highlight of the menu item to indicate selection,
      // then actually send the action once its done.
      this._flashCounter = 0;

      // Set a flag on the root menu to indicate that we are in a
      // flashing state. In the flashing state, no other menu items
      // should become selected.
      menu = this.getPath('parentMenu.rootMenu');
      menu._isFlashing = YES;
      this.invokeLater(this.flashHighlight, 25);
      this.invokeLater(this.sendAction, 150);
    }

    return YES;
  },

  /** @private
    Actually sends the action of the menu item to the target.
  */
  sendAction: function () {
    var action = this.getContentProperty('itemActionKey'),
        target = this.getContentProperty('itemTargetKey'),
        rootMenu = this.getPath('parentMenu.rootMenu'),
        responder;

    // Close the menu
    this.getPath('parentMenu.rootMenu').remove();
    // We're no longer flashing
    rootMenu._isFlashing = NO;

    action = (action === undefined) ? rootMenu.get('action') : action;
    target = (target === undefined) ? rootMenu.get('target') : target;

    // Notify the root menu pane that the selection has changed
    rootMenu.set('selectedItem', this.get('content'));

    // Legacy support for actions that are functions
    if (SC.typeOf(action) === SC.T_FUNCTION) {
      action.apply(target, [rootMenu]);
      
      SC.Logger.warn('Support for menu item action functions has been deprecated. Please use target and action.');
      
    } else {
      responder = this.getPath('pane.rootResponder') || SC.RootResponder.responder;

      if (responder) {
        // Send the action down the responder chain
        responder.sendAction(action, target, rootMenu);
      }
    }

  },

  /** @private
    Toggles the focus class name on the menu item layer to quickly flash the
    highlight. This indicates to the user that a selection has been made.

    This is initially called by performAction(). flashHighlight then keeps
    track of how many flashes have occurred, and calls itself until a maximum
    has been reached.
  */
  flashHighlight: function () {
    var flashCounter = this._flashCounter, layer = this.$();
    if (flashCounter % 2 === 0) {
      layer.addClass('focus');
    } else {
      layer.removeClass('focus');
    }

    if (flashCounter <= 2) {
      this.invokeLater(this.flashHighlight, 50);
      this._flashCounter++;
    }
  },

  /** @private*/
  mouseDown: function (evt) {
    return YES;
  },

  /** @private */
  mouseEntered: function (evt) {
    var menu = this.get('parentMenu'),
        rootMenu = menu.get('rootMenu');

    // Ignore mouse entering if we're in the middle of
    // a menu flash.
    if (rootMenu._isFlashing) return;

    menu.set('mouseHasEntered', YES);
    this.set('mouseHasEntered', YES);
    menu.set('currentMenuItem', this);

    // Become first responder to show highlight
    if (this.get('isEnabled')) {
      this.becomeFirstResponder();
    }

    if (this.get('hasSubMenu')) {
      this._subMenuTimer = this.invokeLater(this.showSubMenu, 100);
    }

    return YES;
  },

  /** @private
    Set the focus based on whether the current menu item is selected or not.
  */
  mouseExited: function (evt) {
    var parentMenu, timer;

    // If we have a submenu, we need to give the user's mouse time to get
    // to the new menu before we remove highlight.
    if (this.get('hasSubMenu')) {
      // If they are exiting the view before we opened the submenu,
      // make sure we don't open it once they've left.
      timer = this._subMenuTimer;
      if (timer) {
        timer.invalidate();
      } else {
        this.invokeLater(this.checkMouseLocation, 100);
      }
    } else {
      parentMenu = this.get('parentMenu');

      if (parentMenu.get('currentMenuItem') === this) {
        parentMenu.set('currentMenuItem', null);
      }
    }

    return YES;
  },

  /** @private */
  touchStart: function (evt) {
    this.mouseEntered(evt);
    return YES;
  },

  /** @private */
  touchEnd: function (evt) {
    return this.mouseUp(evt);
  },

  /** @private */
  touchEntered: function (evt) {
    return this.mouseEntered(evt);
  },

  /** @private */
  touchExited: function (evt) {
    return this.mouseExited(evt);
  },

  /** @private */
  checkMouseLocation: function () {
    var subMenu = this.get('subMenu'), parentMenu = this.get('parentMenu'),
        currentMenuItem, previousMenuItem;

    if (!subMenu.get('mouseHasEntered')) {
      currentMenuItem = parentMenu.get('currentMenuItem');
      if (currentMenuItem === this || currentMenuItem === null) {
        previousMenuItem = parentMenu.get('previousMenuItem');

        if (previousMenuItem) {
          previousMenuItem.resignFirstResponder();
        }
        this.resignFirstResponder();
        subMenu.remove();
      }
    }
  },

  /** @private
    Call the moveUp function on the parent Menu
  */
  moveUp: function (sender, evt) {
    var menu = this.get('parentMenu');
    if (menu) {
      menu.moveUp(this);
    }
    return YES;
  },

  /** @private
    Call the moveDown function on the parent Menu
  */
  moveDown: function (sender, evt) {
    var menu = this.get('parentMenu');
    if (menu) {
      menu.moveDown(this);
    }
    return YES;
  },

  /** @private
    Call the function to create a branch
  */
  moveRight: function (sender, evt) {
    this.showSubMenu();
    return YES;
  },

  /** @private
    Proxies insertText events to the parent menu so items can be selected
    by typing their titles.
  */
  insertText: function (chr, evt) {
    var menu = this.get('parentMenu');
    if (menu) {
      menu.insertText(chr, evt);
    }
  },

  /** @private*/
  keyDown: function (evt) {
    return this.interpretKeyEvents(evt);
  },

  /** @private*/
  keyUp: function (evt) {
    return YES;
  },

  /** @private*/
  cancel: function (evt) {
    this.getPath('parentMenu.rootMenu').remove();
    return YES;
  },

  /** @private*/
  didBecomeFirstResponder: function (responder) {
    if (responder !== this) return;
    var parentMenu = this.get('parentMenu');
    if (parentMenu) {
      parentMenu.set('currentSelectedMenuItem', this);
    }
  },

  /** @private*/
  willLoseFirstResponder: function (responder) {
    if (responder !== this) return;
    var parentMenu = this.get('parentMenu');
    if (parentMenu) {
      parentMenu.set('currentSelectedMenuItem', null);
      parentMenu.set('previousSelectedMenuItem', this);
    }
  },

  /** @private*/
  insertNewline: function (sender, evt) {
    this.mouseUp(evt);
  },

  /**
    Close the parent Menu and remove the focus of the current Selected
    Menu Item
  */
  closeParent: function () {
    this.$().removeClass('focus');
    var menu = this.get('parentMenu');
    if (menu) {
      menu.remove();
    }
  },

  /** @private*/
  clickInside: function (frame, evt) {
    return SC.pointInRect({ x: evt.pageX, y: evt.pageY }, frame);
  },


  // ..........................................................
  // CONTENT OBSERVING
  //

  /** @private
    Add an observer to ensure that we invalidate our cached properties
    whenever the content object’s associated property changes.
  */
  contentDidChange: function () {
    var content    = this.get('content'),
        oldContent = this._content;

    if (content === oldContent) return;

    var f = this.contentPropertyDidChange;
    // remove an observer from the old content if necessary
    if (oldContent  &&  oldContent.removeObserver) oldContent.removeObserver('*', this, f);

    // add observer to new content if necessary.
    this._content = content;
    if (content  &&  content.addObserver) content.addObserver('*', this, f);

    // notify that value did change.
    this.contentPropertyDidChange(content, '*') ;
  }.observes('content'),


  /** @private
    Invalidate our cached property whenever the content object’s associated
    property changes.
  */
  contentPropertyDidChange: function (target, key) {
    // If the key that changed in the content is one of the fields for which
    // we (potentially) cache a value, update our cache.
    var menu = this.get('parentMenu');
    if (!menu) return;

    var mapping           = SC.MenuItemView._contentPropertyToMenuItemPropertyMapping,
        contentProperties = SC.keys(mapping),
        i, len, contentProperty, menuItemProperty;


    // Are we invalidating all keys?
    if (key === '*') {
      for (i = 0, len = contentProperties.length;  i < len;  ++i) {
        contentProperty  = contentProperties[i];
        menuItemProperty = mapping[contentProperty];
        this.notifyPropertyChange(menuItemProperty);
      }
    }
    else {
      for (i = 0, len = contentProperties.length;  i < len;  ++i) {
        contentProperty  = contentProperties[i];
        if (menu.get(contentProperty) === key) {
          menuItemProperty = mapping[contentProperty];
          this.notifyPropertyChange(menuItemProperty);

          // Note:  We won't break here in case the menu is set up to map
          //        multiple properties to the same content key.
        }
      }
    }
  }

});


// ..........................................................
// CLASS PROPERTIES
//

/** @private
  A mapping of the "content property key" keys to the properties we use to
  wrap them.  This hash is used in 'contentPropertyDidChange' to ensure that
  when the content changes a property that is locally cached inside the menu
  item, the cache is properly invalidated.

  Implementor note:  If you add such a cached property, you must add it to
                     this mapping.
*/
SC.MenuItemView._contentPropertyToMenuItemPropertyMapping = {
  itemTitleKey:     'title',
  itemIsEnabledKey: 'isEnabled',
  itemSeparatorKey: 'isSeparator',
  itemSubMenuKey:   'subMenu'
};

/* >>>>>>>>>> BEGIN source/panes/menu.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2010 Sprout Systems, Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('panes/picker');
sc_require('views/menu_item');

/**
  @class

  `SC.MenuPane` allows you to display a standard menu. Menus appear over other
  panes, and block input to other views until a selection is made or the pane
  is dismissed by clicking outside of its bounds.

  You can create a menu pane and manage it yourself, or you can use the
  `SC.SelectButtonView` and `SC.PopupButtonView` controls to manage the menu for
  you.

  ## Specifying Menu Items

  The menu pane examines the `items` property to determine what menu items
  should be presented to the user.

  In its most simple form, you can provide an array of strings. Every item
  will be converted into a menu item whose title is the string.

  If you need more control over the menu items, such as specifying a keyboard
  shortcut, enabled state, custom height, or submenu, you can provide an array
  of content objects.

  Out of the box, the menu pane has some default keys it uses to get
  information from the objects. For example, to find out the title of the menu
  item, the menu pane will ask your object for its `title` property. If you
  need to change this key, you can set the `itemTitleKey` property on the pane
  itself.

      var menuItems = [
        { title: 'Menu Item', keyEquivalent: 'ctrl_shift_n' },
        { title: 'Checked Menu Item', checkbox: YES, keyEquivalent: 'ctrl_a' },
        { title: 'Selected Menu Item', keyEquivalent: ['backspace', 'delete'] },
        { isSeparator: YES },
        { title: 'Menu Item with Icon', icon: 'inbox', keyEquivalent: 'ctrl_m' },
        { title: 'Menu Item with Icon', icon: 'folder', keyEquivalent: 'ctrl_p' }
      ];

      var menu = SC.MenuPane.create({
        items: menuItems
      });

  ## Observing User Selections

  To determine when a user clicks on a menu item, you can observe the
  `selectedItem` property for changes.

  @extends SC.PickerPane
  @since SproutCore 1.0
*/
SC.MenuPane = SC.PickerPane.extend(
/** @scope SC.MenuPane.prototype */ {

  /**
    @type Array
    @default ['sc-menu']
    @see SC.View#classNames
  */
  classNames: ['sc-menu'],

  /**
    The WAI-ARIA role for menu pane.

    @type String
    @default 'menu'
    @constant
  */
  ariaRole: 'menu',


  // ..........................................................
  // PROPERTIES
  //

  /**
    The array of items to display. This can be a simple array of strings,
    objects or hashes. If you pass objects or hashes, you can also set the
    various itemKey properties to tell the menu how to extract the information
    it needs.

    @type Array
    @default []
  */
  items: null,

  /**
    The size of the menu. This will set a CSS style on the menu that can be
    used by the current theme to style the appearance of the control. This
    value will also determine the default `itemHeight`, `itemSeparatorHeight`,
    `menuHeightPadding`, and `submenuOffsetX` if you don't explicitly set these
    properties.

    Your theme can override the default values for each control size by specifying
    them in the `menuRenderDelegate`. For example:

        MyTheme.menuRenderDelegate = SC.BaseTheme.menuRenderDelegate.create({
          'sc-tiny-size': {
            itemHeight: 20,
            itemSeparatorHeight: 9,
            menuHeightPadding: 6,
            submenuOffsetX: 2
          }
        });

    Changing the controlSize once the menu is instantiated has no effect.

    @type String
    @default SC.REGULAR_CONTROL_SIZE
  */
  controlSize: SC.REGULAR_CONTROL_SIZE,

  /**
    The height of each menu item, in pixels.

    You can override this on a per-item basis by setting the (by default)
    `height` property on your object.

    If you don't specify a value, the item height will be inferred from
    `controlSize`.

    @type Number
    @default itemHeight from theme if present, or 20.
  */
  itemHeight: SC.propertyFromRenderDelegate('itemHeight', 20),

  /**
    The height of separator menu items.

    You can override this on a per-item basis by setting the (by default)
    `height` property on your object.

    If you don't specify a value, the height of the separator menu items will
    be inferred from `controlSize`.

    @type Number
    @default itemSeparatorHeight from theme, or 9.
  */
  itemSeparatorHeight: SC.propertyFromRenderDelegate('itemSeparatorHeight', 9),

  /**
    The height of the menu pane. This is updated every time menuItemViews
    is recalculated.

    @type Number
    @default 0
    @isReadOnly
  */
  menuHeight: 0,

  /**
    The amount of padding to add to the height of the pane.

    The first menu item is offset by half this amount, and the other half is
    added to the height of the menu, such that a space between the top and the
    bottom is created.

    If you don't specify a value, the padding will be inferred from the
    controlSize.

    @type Number
    @default menuHeightPadding from theme, or 6
  */
  menuHeightPadding: SC.propertyFromRenderDelegate('menuHeightPadding', 6),

  /**
    The amount of offset x while positioning submenu.

    If you don't specify a value, the padding will be inferred from the
    controlSize.

    @type Number
    @default submenuOffsetX from theme, or 2
  */
  submenuOffsetX: SC.propertyFromRenderDelegate('submenuOffsetX', 2),

  /**
    The last menu item to be selected by the user.

    You can place an observer on this property to be notified when the user
    makes a selection.

    @type SC.Object
    @default null
    @isReadOnly
  */
  selectedItem: null,

  /**
    The view class to use when creating new menu item views.

    The menu pane will automatically create an instance of the view class you
    set here for each item in the `items` array. You may provide your own
    subclass for this property to display the customized content.

    @type SC.View
    @default SC.MenuItemView
  */
  exampleView: SC.MenuItemView,

  /**
    The view or element to which the menu will anchor itself.

    When the menu pane is shown, it will remain anchored to the view you
    specify, even if the window is resized. You should specify the anchor as a
    parameter when calling `popup()`, rather than setting it directly.

    @type SC.View
    @isReadOnly
  */
  anchor: null,

  /**
    `YES` if this menu pane was generated by a parent `SC.MenuPane`.

    @type Boolean
    @default NO
    @isReadOnly
  */
  isSubMenu: NO,

  /**
    Whether the title of menu items should be localized before display.

    @type Boolean
    @default YES
  */
  localize: YES,

  /**
    Whether or not this menu pane should accept the “current menu pane”
    designation when visible, which is the highest-priority pane when routing
    events.  Generally you want this set to `YES` so that your menu pane can
    intercept keyboard events.

    @type Boolean
    @default YES
  */
  acceptsMenuPane: YES,

  /**
    Disable context menu.

    @type Boolean
    @default NO
  */
  isContextMenuEnabled: NO,


  // ..........................................................
  // METHODS
  //

  /**
    Makes the menu visible and adds it to the HTML document.

    If you provide a view or element as the first parameter, the menu will
    anchor itself to the view, and intelligently reposition itself if the
    contents of the menu exceed the available space.

    @param {SC.View} anchorViewOrElement the view or element to which the menu
    should anchor.
    @param {Array} (preferMatrix) The prefer matrix used to position the pane.
  */
  popup: function (anchorViewOrElement, preferMatrix) {
    this.beginPropertyChanges();
    if (anchorViewOrElement) {
      if (anchorViewOrElement.isView) {
        this._anchorView = anchorViewOrElement;
        this._setupScrollObservers(anchorViewOrElement);
      } else {
        this._anchorHTMLElement = anchorViewOrElement;
      }
    }
   // this.set('anchor',anchorViewOrElement);
    if (preferMatrix) this.set('preferMatrix', preferMatrix);

    this.adjust('height', this.get('menuHeight'));
    this.positionPane();

    // Because panes themselves do not receive key events, we need to set the
    // pane's defaultResponder to itself. This way key events can be
    // interpreted in keyUp.
    this.set('defaultResponder', this);
    this.endPropertyChanges();

    // Prevent body overflow (we don't want to overflow because of shadows).
    SC.bodyOverflowArbitrator.requestHidden(this, true);

    this.append();
  },

  // ..........................................................
  // ITEM KEYS
  //

  /**
    The name of the property that contains the title for each item.

    @type String
    @default "title"
    @commonTask Menu Item Properties
  */
  itemTitleKey: 'title',

  /**
    The name of the property that determines whether the item is enabled.

    @type String
    @default "isEnabled"
    @commonTask Menu Item Properties
  */
  itemIsEnabledKey: 'isEnabled',

  /**
    The name of the property that contains the value for each item.

    @type String
    @default "value"
    @commonTask Menu Item Properties
  */
  itemValueKey: 'value',

  /**
    The name of the property that contains the icon for each item.

    @type String
    @default "icon"
    @commonTask Menu Item Properties
  */
  itemIconKey: 'icon',

  /**
    The name of the property that contains the height for each item.

    @readOnly
    @type String
    @default "height"
    @commonTask Menu Item Properties
  */
  itemHeightKey: 'height',

  /**
    The name of the property that contains an optional submenu for each item.

    @type String
    @default "subMenu"
    @commonTask Menu Item Properties
  */
  itemSubMenuKey: 'subMenu',

  /**
    The name of the property that determines whether the item is a menu
    separator.

    @type String
    @default "isSeparator"
    @commonTask Menu Item Properties
  */
  itemSeparatorKey: 'isSeparator',

  /**
    The name of the property that contains the target for the action that is
    triggered when the user clicks the menu item.

    Note that this property is ignored if the menu item has a submenu.

    @type String
    @default "target"
    @commonTask Menu Item Properties
  */
  itemTargetKey: 'target',

  /**
    The name of the property that contains the action that is triggered when
    the user clicks the menu item.

    Note that this property is ignored if the menu item has a submenu.

    @type String
    @default "action"
    @commonTask Menu Item Properties
  */
  itemActionKey: 'action',

  /**
    The name of the property that determines whether the menu item should
    display a checkbox.

    @type String
    @default "checkbox"
    @commonTask Menu Item Properties
  */
  itemCheckboxKey: 'checkbox',

  /**
    The name of the property that contains the shortcut to be displayed.

    The shortcut should communicate the keyboard equivalent to the user.

    @type String
    @default "shortcut"
    @commonTask Menu Item Properties
  */
  itemShortCutKey: 'shortcut',

  /**
    The name of the property that contains the key equivalent of the menu
    item.

    The action of the menu item will be fired, and the menu pane's
    `selectedItem` property set to the menu item, if the user presses this
    key combination on the keyboard.

    @type String
    @default "keyEquivalent"
    @commonTask Menu Item Properties
  */
  itemKeyEquivalentKey: 'keyEquivalent',

  /**
    The name of the property that determines whether menu flash should be
    disabled.

    When you click on a menu item, it will flash several times to indicate
    selection to the user. Some browsers block windows from opening outside of
    a mouse event, so you may wish to disable menu flashing if the action of
    the menu item should open a new window.

    @type String
    @default "disableMenuFlash"
    @commonTask Menu Item Properties
  */
  itemDisableMenuFlashKey: 'disableMenuFlash',

  /**
    The name of the property that determines whether layerID should be applied to the item .

    @type String
    @default "layerId"
    @commonTask Menu Item Properties
  */
  itemLayerIdKey: 'layerId',

  /**
    The name of the property that determines whether a unique exampleView should be created for the item .

    @type String
    @default "exampleView"
    @commonTask Menu Item Properties
  */
  itemExampleViewKey: 'exampleView',

  /**
    The array of keys used by SC.MenuItemView when inspecting your menu items
    for display properties.

    @private
    @isReadOnly
    @type Array
  */
  menuItemKeys: ['itemTitleKey', 'itemValueKey', 'itemIsEnabledKey', 'itemIconKey', 'itemSeparatorKey', 'itemActionKey', 'itemCheckboxKey', 'itemShortCutKey', 'itemHeightKey', 'itemSubMenuKey', 'itemKeyEquivalentKey', 'itemTargetKey', 'itemLayerIdKey'],

  // ..........................................................
  // DEFAULT PROPERTIES
  //

  /*
    If an item doesn't specify a target, this is used. (Only used if an action is found and is not a function.)

    @type String
    @default null
  */
  target: null,

  /*
    If an item doesn't specify an action, this is used.

    @type String
    @default null
  */
  action: null,

  // ..........................................................
  // INTERNAL PROPERTIES
  //

  /** @private */
  preferType: SC.PICKER_MENU,

  /**
    Create a modal pane beneath the menu that will prevent any mouse clicks
    that fall outside the menu pane from triggering an inadvertent action.

    @type Boolean
    @private
  */
  isModal: YES,

  // ..........................................................
  // INTERNAL METHODS
  //

  /** @private */
  init: function () {
    // Initialize the items array.
    if (!this.items) { this.items = []; }

    // An associative array of the shortcut keys. The key is the shortcut in the
    // form 'ctrl_z', and the value is the menu item of the action to trigger.
    this._keyEquivalents = {};

    // Continue initializing now that default values exist.
    arguments.callee.base.apply(this,arguments);
  },

  displayProperties: ['controlSize'],

  renderDelegateName: 'menuRenderDelegate',

  /**
    Creates the child scroll view, and sets its `contentView` to a new
    view.  This new view is saved and managed by the `SC.MenuPane`,
    and contains the visible menu items.

    @private
    @returns {SC.View} receiver
  */
  createChildViews: function () {
    var scroll, menuView, menuItemViews;

    scroll = this._menuScrollView = this.createChildView(SC.MenuScrollView, {
      controlSize: this.get('controlSize')
    });

    menuView = this._menuView = SC.View.create({
      parentViewDidResize: function () {
        this.notifyPropertyChange('frame');
      },

      viewDidResize: function () {

      }
    });

    menuItemViews = this.get('menuItemViews');
    menuView.replaceAllChildren(menuItemViews);

    // Adjust our menu view's layout to fit the calculated menu height.
    menuView.set('layout', { top: 0, left: 0, height : this.get('menuHeight')});

    scroll.set('contentView', menuView);

    this.childViews = [scroll];

    return this;
  },

  /**
    Called when the pane is attached.  Takes on menu pane status.

    We don't call `arguments.callee.base.apply(this,arguments)` here because `PanelPane` sets the current pane to
    be the key pane when attached.
  */
  didAppendToDocument: function () {
    this.becomeMenuPane();
  },

  /**
    Called when the pane is detached.  Closes all submenus and resigns menu pane
    status.

    We don't call `arguments.callee.base.apply(this,arguments)` here because `PanelPane` resigns key pane when
    detached.
  */
  willRemoveFromDocument: function () {
    var parentMenu = this.get('parentMenu');

    this.set('currentMenuItem', null);
    this.closeOpenMenus();
    this.resignMenuPane();

    if (parentMenu) {
      parentMenu.becomeMenuPane();
    }
  },

  /**
    Make the pane the menu pane. When you call this, all key events will
    temporarily be routed to this pane. Make sure that you call
    resignMenuPane; otherwise all key events will be blocked to other panes.

    @returns {SC.Pane} receiver
  */
  becomeMenuPane: function () {
    if (this.rootResponder) this.rootResponder.makeMenuPane(this);

    return this;
  },

  /**
    Remove the menu pane status from the pane.  This will simply set the
    `menuPane` on the `rootResponder` to `null.

    @returns {SC.Pane} receiver
  */
  resignMenuPane: function () {
    if (this.rootResponder) this.rootResponder.makeMenuPane(null);

    return this;
  },

  /**
    The array of child menu item views that compose the menu.

    This computed property parses `displayItems` and constructs an
    `SC.MenuItemView` (or whatever class you have set as the `exampleView`) for every item.

    This calls createMenuItemViews. If you want to override this property, override
    that method.

    @type
    @type Array
    @readOnly
  */
  menuItemViews: function () {
    return this.createMenuItemViews();
  }.property('displayItems').cacheable(),

  /**
    Processes the displayItems and creates menu item views for each item.

    Override this method to change how menuItemViews is calculated.

    @return Array
  */
  createMenuItemViews: function () {
    var views = [], items = this.get('displayItems'),
        exampleView = this.get('exampleView'), item, itemView, view,
        exampleViewKey, itemExampleView,
        height, heightKey, separatorKey, defaultHeight, separatorHeight,
        menuHeight, menuHeightPadding, keyEquivalentKey, keyEquivalent,
        keyArray, idx, layerIdKey, propertiesHash,
        len;

    if (!items) return views; // return an empty array

    heightKey = this.get('itemHeightKey');
    separatorKey = this.get('itemSeparatorKey');
    exampleViewKey = this.get('itemExampleViewKey');
    defaultHeight = this.get('itemHeight');
    keyEquivalentKey = this.get('itemKeyEquivalentKey');
    separatorHeight = this.get('itemSeparatorHeight');
    layerIdKey = this.get('itemLayerIdKey');
    menuHeightPadding = Math.floor(this.get('menuHeightPadding') / 2);
    menuHeight = menuHeightPadding;

    keyArray = this.menuItemKeys.map(SC._menu_fetchKeys, this);

    len = items.get('length');
    for (idx = 0; idx < len; idx++) {
      item = items[idx];
      height = item.get(heightKey);
      if (!height) {
        height = item.get(separatorKey) ? separatorHeight : defaultHeight;
        
        // TODO: Remove in 1.10 and 2.0
        // Help the developer if they were relying on the previously misleading
        // default value of itemSeparatorKey.  We need to ensure that the change
        // is backwards compatible with apps prior to 1.9.
        if (separatorKey === 'isSeparator' && SC.none(item.get('isSeparator')) && item.get('separator')) {
          SC.warn("Developer Warning: the default value of itemSeparatorKey has been changed from 'separator' to 'isSeparator' to match the documentation.  Please update your menu item properties to 'isSeparator: YES' to remove this warning.");
          height = separatorHeight;
          item.set('isSeparator', YES);
        }
        
      }

      propertiesHash = {
        layout: { height: height, top: menuHeight },
        contentDisplayProperties: keyArray,
        content: item,
        parentMenu: this
      };

      if (item.get(layerIdKey)) {
        propertiesHash.layerId = item.get(layerIdKey);
      }

      // Item has its own exampleView so use it
      itemExampleView = item.get(exampleViewKey);
      if (itemExampleView) {
        itemView = itemExampleView;
      } else {
        itemView = exampleView;
      }

      view = this._menuView.createChildView(itemView, propertiesHash);
      views[idx] = view;
      menuHeight += height;
      keyEquivalent = item.get(keyEquivalentKey);
      if (keyEquivalent) {
        // if array, apply each one for this view
        if (SC.typeOf(keyEquivalent) === SC.T_ARRAY) {
          keyEquivalent.forEach(function (keyEq) {
            this._keyEquivalents[keyEq] = view;
          }, this);
        } else {
          this._keyEquivalents[keyEquivalent] = view;
        }
      }
    }

    this.set('menuHeight', menuHeight + menuHeightPadding);
    return views;
  },

  /**
    Returns the menu item view for the content object at the specified index.

    @param Number idx the item index
    @returns {SC.MenuItemView} instantiated view
  */
  menuItemViewForContentIndex: function (idx) {
    var menuItemViews = this.get('menuItemViews');

    if (!menuItemViews) return undefined;
    return menuItemViews.objectAt(idx);
  },

  /**
    If this is a submenu, this property corresponds to the
    top-most parent menu. If this is the root menu, it returns
    itself.

    @type SC.MenuPane
    @isReadOnly
    @type
  */
  rootMenu: function () {
    if (this.get('isSubMenu')) return this.getPath('parentMenu.rootMenu');
    return this;
  }.property('isSubMenu').cacheable(),


  destroy: function () {
    var ret = arguments.callee.base.apply(this,arguments);

    // Clean up previous enumerable observer.
    if (this._sc_menu_items) {
      this._sc_menu_items.removeObserver('[]', this, '_sc_menu_itemPropertiesDidChange');
    }

    // Destroy the menu view we created.  The scroll view's container will NOT
    // destroy this because it receives it already instantiated.
    this._menuView.destroy();

    // Clean up caches.
    this._sc_menu_items = null;
    this._menuView = null;

    return ret;
  },

  /**
    Close the menu if the user resizes the window.

    @private
  */
  windowSizeDidChange: function () {
    this.remove();
    return arguments.callee.base.apply(this,arguments);
  },

  /**
    Returns an array of normalized display items.

    Because the items property can be provided as either an array of strings,
    or an object with key-value pairs, or an exotic mish-mash of both, we need
    to normalize it for our display logic.

    If an `items` member is an object, we can assume it is formatted properly
    and leave it as-is.

    If an `items` member is a string, we create a hash with the title value
    set to that string, and some sensible defaults for the other properties.

    A side effect of running this computed property is that the menuHeight
    property is updated.

    `displayItems` should never be set directly; instead, set `items` and
    `displayItems` will update automatically.

    @type
    @type Array
    @isReadOnly
  */
  displayItems: function () {
    var items = this.get('items'),
      len,
      ret = [], idx, item, itemType;

    if (!items) return null;

    len = items.get('length');

    // Loop through the items property and transmute as needed, then
    // copy the new objects into the ret array.
    for (idx = 0; idx < len; idx++) {
      item = items.objectAt(idx);

      // fast track out if we can't do anything with this item
      if (!item) continue;

      itemType = SC.typeOf(item);
      if (itemType === SC.T_STRING) {
        item = SC.Object.create({ title: item,
                                  value: item,
                                  isEnabled: YES
                               });
      } else if (itemType === SC.T_HASH) {
        item = SC.Object.create(item);
      }
      item.contentIndex = idx;

      ret.push(item);
    }

    return ret;
  }.property('items').cacheable(),

  _sc_menu_itemsDidChange: function () {
    var items = this.get('items');

    // Clean up previous enumerable observer.
    if (this._sc_menu_items) {
      this._sc_menu_items.removeObserver('[]', this, '_sc_menu_itemPropertiesDidChange');
    }

    // Add new enumerable observer
    if (items) {
      items.addObserver('[]', this, '_sc_menu_itemPropertiesDidChange');
    }

    // Cache the last items.
    this._sc_menu_items = items;

    var itemViews;
    itemViews = this.get('menuItemViews');
    this._menuView.replaceAllChildren(itemViews);
    this._menuView.adjust('height', this.get('menuHeight'));
  }.observes('items'),

  _sc_menu_itemPropertiesDidChange: function () {
    // Indicate that the displayItems changed.
    this.notifyPropertyChange('displayItems');

    var itemViews;
    itemViews = this.get('menuItemViews');
    this._menuView.replaceAllChildren(itemViews);
    this._menuView.adjust('height', this.get('menuHeight'));
  },

  currentMenuItem: function (key, value) {
    if (value !== undefined) {
      if (this._currentMenuItem !== null) {
        this.set('previousMenuItem', this._currentMenuItem);
      }
      this._currentMenuItem = value;
      this.setPath('rootMenu.targetMenuItem', value);

      return value;
    }

    return this._currentMenuItem;
  }.property().cacheable(),

  _sc_menu_currentMenuItemDidChange: function () {
    var currentMenuItem = this.get('currentMenuItem'),
        previousMenuItem = this.get('previousMenuItem');

    if (previousMenuItem) {
      if (previousMenuItem.get('hasSubMenu') && currentMenuItem === null) {

      } else {
        previousMenuItem.resignFirstResponder();
        this.closeOpenMenusFor(previousMenuItem);
      }
    }

    // Scroll to the selected menu item if it's not visible on screen.
    // This is useful for keyboard navigation and programmatically selecting
    // the selected menu item, as in `SelectButtonView`.
    if (currentMenuItem && currentMenuItem.get('isEnabled')) {
      currentMenuItem.scrollToVisible();
    }
  }.observes('currentMenuItem'),

  closeOpenMenusFor: function (menuItem) {
    if (!menuItem) return;

    var menu = menuItem.get('parentMenu');

    // Close any open menus if a root menu changes
    while (menu && menuItem) {
      menu = menuItem.get('subMenu');
      if (menu) {
        menu.remove();
        menuItem.resignFirstResponder();
        menuItem = menu.get('previousMenuItem');
      }
    }
  },

  closeOpenMenus: function () {
    this.closeOpenMenusFor(this.get('previousMenuItem'));
  },

  //Mouse and Key Events

  /** @private */
  mouseDown: function (evt) {
    this.modalPaneDidClick(evt);
    return YES;
  },

  /** @private
    Note when the mouse has entered, so that if this is a submenu,
    the menu item to which it belongs knows whether to maintain its highlight
    or not.

    @param {Event} evt
  */
  mouseEntered: function () {
    this.set('mouseHasEntered', YES);
  },

  keyUp: function (evt) {
    var ret = this.interpretKeyEvents(evt);
    return !ret ? NO : ret;
  },

  /**
    Selects the next enabled menu item above the currently
    selected menu item when the up-arrow key is pressed.

    @private
  */
  moveUp: function () {
    var currentMenuItem = this.get('currentMenuItem'),
        items = this.get('menuItemViews'),
        currentIndex, idx;

    if (!currentMenuItem) {
      idx = items.get('length') - 1;
    } else {
      currentIndex = currentMenuItem.getPath('content.contentIndex');
      if (currentIndex === 0) return YES;
      idx = currentIndex - 1;
    }

    while (idx >= 0) {
      if (items[idx].get('isEnabled')) {
        this.set('currentMenuItem', items[idx]);
        items[idx].becomeFirstResponder();
        break;
      }
      idx--;
    }

    return YES;
  },

  /**
    Selects the next enabled menu item below the currently
    selected menu item when the down-arrow key is pressed.

    @private
  */
  moveDown: function () {
    var currentMenuItem = this.get('currentMenuItem'),
        items = this.get('menuItemViews'),
        len = items.get('length'),
        currentIndex, idx;

    if (!currentMenuItem) {
      idx = 0;
    } else {
      currentIndex = currentMenuItem.getPath('content.contentIndex');
      if (currentIndex === len) return YES;
      idx = currentIndex + 1;
    }

    while (idx < len) {
      if (items[idx].get('isEnabled')) {
        this.set('currentMenuItem', items[idx]);
        items[idx].becomeFirstResponder();
        break;
      }
      idx++;
    }

    return YES;
  },

  /**
    Selects the first enabled menu item when the home key is pressed.

    @private
   */
  moveToBeginningOfDocument: function () {
    var items = this.get('menuItemViews'),
        len = items.get('length'),
        idx = 0;

    while (idx < len) {
      if (items[idx].get('isEnabled')) {
        this.set('currentMenuItem', items[idx]);
        items[idx].becomeFirstResponder();
        break;
      }
      ++idx;
    }

    return YES;
  },

  /**
    Selects the last enabled menu item when the end key is pressed.

    @private
  */
  moveToEndOfDocument: function () {
    var items = this.get('menuItemViews'),
        len = items.get('length'),
        idx = len - 1;

    while (idx >= 0) {
      if (items[idx].get('isEnabled')) {
        this.set('currentMenuItem', items[idx]);
        items[idx].becomeFirstResponder();
        break;
      }
      --idx;
    }

    return YES;
  },

  /**
    Selects the next item one page down. If that is not enabled,
    continues to move down until it finds an enabled item.

    @private
  */
  pageDown: function () {
    var currentMenuItem = this.get('currentMenuItem'),
        item, items = this.get('menuItemViews'),
        len = items.get('length'),
        idx = 0,
        foundItemIdx,
        verticalOffset = 0,
        verticalPageScroll;

    if (this._menuScrollView && this._menuScrollView.verticalScrollerView2) {

      if (currentMenuItem) {
        idx = currentMenuItem.getPath('content.contentIndex');
      }

      foundItemIdx = idx;
      verticalPageScroll = this._menuScrollView.get('verticalPageScroll');
      for (idx; idx < len; idx++) {
        item = items[idx];
        verticalOffset += item.get('layout').height;

        if (verticalOffset > verticalPageScroll) {
          // We've gone further than an entire page scroll, so stop.
          break;
        } else {
          // Only accept enabled items (which also excludes separators).
          if (item.get('isEnabled')) { foundItemIdx = idx; }
        }
      }

      item = items[foundItemIdx];
      this.set('currentMenuItem', item);
      item.becomeFirstResponder();
    } else {
      this.moveToEndOfDocument();
    }

    return YES;
  },

  /**
    Selects the previous item one page up. If that is not enabled,
    continues to move up until it finds an enabled item.

    @private
  */
  pageUp: function () {
    var currentMenuItem = this.get('currentMenuItem'),
        item, items = this.get('menuItemViews'),
        len = items.get('length'),
        idx = len - 1,
        foundItemIdx,
        verticalOffset = 0,
        verticalPageScroll;

    if (this._menuScrollView && this._menuScrollView.verticalScrollerView) {

      if (currentMenuItem) {
        idx = currentMenuItem.getPath('content.contentIndex');
      }

      foundItemIdx = idx;
      verticalPageScroll = this._menuScrollView.get('verticalPageScroll');
      for (idx; idx >= 0; idx--) {
        item = items[idx];
        verticalOffset += item.get('layout').height;

        if (verticalOffset > verticalPageScroll) {
          // We've gone further than an entire page scroll, so stop.
          break;
        } else {
          // Only accept enabled items (which also excludes separators).
          if (item.get('isEnabled')) { foundItemIdx = idx; }
        }
      }

      item = items[foundItemIdx];
      this.set('currentMenuItem', item);
      item.becomeFirstResponder();
    } else {
      this.moveToBeginningOfDocument();
    }

    return YES;
  },

  insertText: function (chr) {
    var timer = this._timer, keyBuffer = this._keyBuffer;

    if (timer) {
      timer.invalidate();
    }
    timer = this._timer = SC.Timer.schedule({
      target: this,
      action: 'clearKeyBuffer',
      interval: 500,
      isPooled: NO
    });

    keyBuffer = keyBuffer || '';
    keyBuffer += chr.toUpperCase();

    this.selectMenuItemForString(keyBuffer);
    this._keyBuffer = keyBuffer;

    return YES;
  },

  /** @private
    Called by the view hierarchy when the menu should respond to a shortcut
    key being pressed.

    Normally, the menu will only respond to key presses when it is visible.
    However, when the menu is part of another control, such as an
    SC.PopupButtonView, the menu should still respond if it is hidden but its
    parent control is visible. In those cases, the parameter
    fromVisibleControl will be set to `YES`.

    @param keyEquivalent {String} the shortcut key sequence that was pressed
    @param fromVisibleControl Boolean if the shortcut key press was proxied
    to this menu by a visible parent control
    @returns Boolean
  */
  performKeyEquivalent: function (keyEquivalent, evt, fromVisibleControl) {
    //If menu is not visible
    if (!fromVisibleControl && !this.get('isVisibleInWindow')) return NO;

    // Look for menu item that has this key equivalent
    var menuItem = this._keyEquivalents[keyEquivalent];

    // If found, have it perform its action
    if (menuItem) {
      menuItem.performAction(YES);
      return YES;
    }

    // If escape key or the enter key was pressed and no menu item handled it,
    // close the menu pane and return YES that the event was handled
    if (keyEquivalent === 'escape' || keyEquivalent === 'return') {
      this.remove();
      return YES;
    }

    return NO;

  },

  selectMenuItemForString: function (buffer) {
    var items = this.get('menuItemViews'), item, title, idx, len, bufferLength;
    if (!items) return;

    bufferLength = buffer.length;
    len = items.get('length');
    for (idx = 0; idx < len; idx++) {
      item = items.objectAt(idx);
      title = item.get('title');

      if (!title) continue;

      title = title.replace(/ /g, '').substr(0, bufferLength).toUpperCase();
      if (title === buffer) {
        this.set('currentMenuItem', item);
        item.becomeFirstResponder();
        break;
      }
    }
  },

  /**
    Clear the key buffer if the user does not enter any text after a certain
    amount of time.

    This is called by the timer created in the `insertText` method.

    @private
  */
  clearKeyBuffer: function () {
    this._keyBuffer = '';
  },

  /**
    Close the menu and any open submenus if the user clicks outside the menu.

    Because only the root-most menu has a modal pane, this will only ever get
    called once.

    @returns Boolean
    @private
  */
  modalPaneDidClick: function () {
    this.remove();

    return YES;
  }
});

SC._menu_fetchKeys = function (k) {
  return this.get(k);
};
SC._menu_fetchItem = function (k) {
  if (!k) return null;
  return this.get ? this.get(k) : this[k];
};

// If a menu pane exceeds the height of the viewport, it will
// be truncated to fit. This value determines the amount by which
// the menu will be offset from the top and bottom of the viewport.
SC.MenuPane.VERTICAL_OFFSET = 23;

/* >>>>>>>>>> BEGIN source/panes/sheet.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('panes/panel');

/**
 @class

   Displays a modal sheet pane that animates from the top of the viewport.

 The default way to use the sheet pane is to simply add it to your page like this:

 SC.SheetPane.create({
        layout: { width: 400, height: 200, centerX: 0 },
        contentView: SC.View.extend({
        })
      }).append();

 This will cause your sheet panel to display.  The default layout for a Sheet
 is to cover the entire document window with a semi-opaque background, and to
 resize with the window.

 @extends SC.PanelPane
 @since SproutCore 1.0
 @author Evin Grano
 @author Tom Dale
 @author Joe Gaudet
 */
SC.SheetPane = SC.PanelPane.extend(
  /** @scope SC.SheetPane.prototype */
  {

    /**
     @type {Array}
     @default {['sc-sheet']}
     @see {SC.View#classNames}
     */
    classNames: ['sc-sheet'],

    /**
     @type SC.View
     @default SC.ModalPane
     */
    modalPane: SC.ModalPane,

    /**
     * Duration in seconds
     * @type {Number}
     */
    duration: 0.3,

    /**
     * Timing Function
     *
     * @type {String}
     */
    timing: 'ease-in-out',

    /** @private */
    transitionIn: SC.View.SLIDE_IN,

    /** @private */
    transitionInOptions: function () {
      return {
        direction: 'down',
        duration: this.get('duration'),
        timing: this.get('timing')
      };
    }.property('timing', 'duration').cacheable(),


    /** @private */
    transitionOut: SC.View.SLIDE_OUT,

    /** @private */
    transitionOutOptions: function () {
      return {
        direction: 'up',
        duration: this.get('duration'),
        timing: this.get('timing')
      };
    }.property('timing', 'duration').cacheable()

  });


/* >>>>>>>>>> BEGIN source/protocols/drag_data_source.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('system/drag') ;

/**
  @namespace

  This protocol implements a dynamic data source for a drag operation. You can
  return a set of allowed data types and then the method will be used to 
  actually get data in that format when requested.
*/
SC.DragDataSource = {

  /**
    Implement this property as an array of data types you want to support
    for drag operations.

    @type Array
    @default []
  */
  dragDataTypes: [],

  /**
    Implement this method to return the data in the format passed.  Return
    null if the requested data type cannot be generated.
    
    @param {SC.Drag} drag The Drag instance managing this drag.
    @param {Object} dataType The proposed dataType to return.  This will 
      always be one of the data types declared in dragDataTypes.
    
    @returns The data object for the specified type
  */
  dragDataForType: function(drag, dataType) {
    return null;
  }

};


/* >>>>>>>>>> BEGIN source/protocols/drag_source.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('system/drag') ;

/**
  @namespace

  The DragSource protocol is used to dynamically generate multiple types of
  data from a single object.  You must implement this protocol if you want to
  provide the data for a drag event.
*/
SC.DragSource = {

  /**
    This method must be overridden for drag operations to be allowed. 
    Return a bitwise OR'd mask of the drag operations allowed on the
    specified target.  If you don't care about the target, just return a
    constant value.
    
    The default implementation returns `SC.DRAG_NONE`
    
    @param {SC.View} dropTarget The proposed target of the drop.
    @param {SC.Drag} drag The SC.Drag instance managing this drag.
  */
  dragSourceOperationMaskFor: function(drag, dropTarget) {
    return SC.DRAG_NONE;
  },
  
  /**
    If this property is set to `NO` or is not implemented, then the user may
    modify the drag operation by changing the modifier keys they have 
    pressed.
    
    @type Boolean
    @default NO
  */
  ignoreModifierKeysWhileDragging: NO,
    
  /**
    This method is called when the drag begins. You can use this to do any
    visual highlighting to indicate that the receiver is the source of the 
    drag.
    
    @param {SC.Drag} drag The Drag instance managing this drag.
    @param {Point} loc The point in *window* coordinates where the drag 
      began.  You can use convertOffsetFromView() to convert this to local 
      coordinates.
  */
  dragDidBegin: function(drag, loc) {},
  
  /**
    This method is called whenever the drag image is moved.  This is
    similar to the `dragUpdated()` method called on drop targets.
    
    @param {SC.Drag} drag The Drag instance managing this drag.
    @param {Point} loc  The point in *window* coordinates where the drag 
      mouse is.  You can use convertOffsetFromView() to convert this to local 
      coordinates.
  */
  dragDidMove: function(drag, loc) {},
  
  /**
    This method is called when the drag ended. You can use this to do any
    cleanup.  The operation is the actual operation performed on the drag.
    
    @param {SC.Drag} drag The drag instance managing the drag.
    @param {Point} loc The point in WINDOW coordinates where the drag
      ended.
    @param {DragOp} op The drag operation that was performed. One of
      SC.DRAG_COPY, SC.DRAG_MOVE, SC.DRAG_LINK, or SC.DRAG_NONE.
  */
  dragDidEnd: function(drag, loc, op) {}

};

/* >>>>>>>>>> BEGIN source/protocols/drop_target.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('system/drag');

/**
  @namespace
  
  Implement the DropTarget protocol in your view to be able to accept drop events. You 
  should define the methods below as needed to handle accepting of events.
  
  See the method descriptions for more information on what you need to implement.
  
  The general call sequence for all drop targets is (in pseudo-Ragel, regex
  format):
  
      dragStarted
      (
        computeDragOperations+
        (
          dragEntered
          dragUpdated
          ( computeDragOperations | dragUpdated )*
          ( acceptDragOperation performDragOperation? )? // mouseUp
          dragExited
        )*
      )*
      dragEnded
  
  Thus, every drop target will have its dragStarted and dragEnded methods called 
  once during every drag session. computeDragOperations, if called at all, may be 
  called more than once before the dragEntered method is called. Once dragEntered 
  is called, you are at guaranteed that both dragUpdated and dragExited will be 
  called at some point, followed by either dragEnded or additional 
  computeDragOperation calls.
*/
SC.DropTarget = {
  
  /**
    Must be true when your view is instantiated.
    
    Drop targets must be specially registered in order to receive drop
    events.  SproutCore knows to register your view when this property
    is true on view creation.
    
    @type Boolean
    @default YES
    @constant
  */  
  isDropTarget: YES,

  /**
    Called when the drag is started, regardless of where or not your drop
    target is current. You can use this to highlight your drop target
    as "eligible".
    
    The default implementation does nothing.
    
    @param {SC.Drag} drag The current drag object.
    @param {SC.Event} evt The most recent mouse move event.  Use to get location 
  */
  dragStarted: function(drag, evt) {},
  
  /**
    Called when the drag first enters the droppable area, if it returns a
    drag operations other than `SC.DRAG_NONE`.
    
    The default implementation does nothing.
    
    @param drag {SC.Drag} The current drag object.
    @param evt {SC.Event} The most recent mouse move event.  Use to get location
  */
  dragEntered: function(drag, evt) {},
  
  /**
    Called periodically when a drag is over your droppable area.
    
    Override this method this to update various elements of the drag state, 
    including the location of ghost view.  You should  use this method to 
    implement snapping.
    
    This method will be called periodically, even if the user is not moving
    the drag.  If you perform expensive operations, be sure to check the
    mouseLocation property of the drag to determine if you actually need to
    update anything before doing your expensive work.
    
    The default implementation does nothing.
    
    @param {SC.Drag} drag The current drag object.
    @param {SC.Event} evt The most recent mouse move event. Use to get location
  */
  dragUpdated: function(drag, evt) {},
  
  /**
    Called when the user exits your droppable area or the drag ends
    and you were the last targeted droppable area.
    
    Override this method to perform any clean up on your UI such as hiding 
    a special highlight state or removing insertion points.
    
    The default implementation does nothing.
    
    @param {SC.Drag} drag The current drag object
    @param {SC.Event}   evt  The most recent mouse move event. Use to get location.
  */
  dragExited: function(drag, evt) {},
  
  /**
    Called on all drop targets when the drag ends.  
    
    For example, the user might have dragged the view off the screen and let 
    go or they might have hit escape.  Override this method to perform any 
    final cleanup.  This will be called instead of dragExited.
    
    The default implementation does nothing.
    
    @param {SC.Drag} drag The current drag object
    @param {SC.Event}   evt  The most recent mouse move event. Use to get location.
  */
  dragEnded: function(drag, evt) {},
  
  /**
    Called when the drag needs to determine which drag operations are
    valid in a given area.
    
    Override this method to return an OR'd mask of the allowed drag 
    operations.  If the user drags over a droppable area within another 
    droppable area, the drag will latch onto the deepest view that returns one 
    or more available operations.
    
    The default implementation returns `SC.DRAG_NONE`
    
    @param {SC.Drag} drag The current drag object
    @param {SC.Event} evt The most recent mouse move event.  Use to get 
      location 
    @param {DragOp} op The proposed drag operation. A drag constant
    
    @returns {DragOps} A mask of all the drag operations allowed or 
      SC.DRAG_NONE
  */
  computeDragOperations: function(drag, evt, op) {
    return SC.DRAG_NONE;
  },
  
  /**
    Called when the user releases the mouse.
    
    This method gives your drop target one last opportunity to choose to 
    accept the proposed drop operation.  You might use this method to
    perform fine-grained checks on the drop location, for example.
    Return true to accept the drop operation.
    
    The default implementation returns `YES`.
    
    @param {SC.Drag} drag The drag instance managing this drag
    @param {DragOp} op The proposed drag operation. A drag constant
    
    @return {Boolean} YES if operation is OK, NO to cancel.
  */  
  acceptDragOperation: function(drag, op) {
    return YES;
  },
  
  /**
    Called to actually perform the drag operation.
    
    Override this method to actually perform the drag operation.  This method
    is only called if you returned `YES` in `acceptDragOperation()`. 
    
    Return the operation that was actually performed or `SC.DRAG_NONE` if the 
    operation was aborted.
    
    The default implementation returns `SC.DRAG_NONE`
    
    @param {SC.Drag} drag The drag instance managing this drag
    @param {DragOp} op The proposed drag operation. A drag constant.
    
    @return {DragOp} Drag Operation actually performed
  */
  performDragOperation: function(drag, op) {
    return SC.DRAG_NONE;
  }
  
};

/* >>>>>>>>>> BEGIN source/protocols/responder.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


/** @static

  This protocol defines the allowable responder methods. To implement a
  specific responder method, and a method with the correct signature to your
  class.

  **DO NOT INCLUDE THIS MIXIN**.

  If you try and include this mixin, an error will be raised on startup.

  @author Erich Ocean
  @since SproutCore 1.0
*/
SC.ResponderProtocol = {

  // .......................................................................
  // Mouse Event Handlers
  //

  /**
    Called when the mouse is pressed. You must return `YES` to receive
    mouseDragged and mouseUp in the future.

    @param evt {SC.Event} the mousedown event
    @returns {Boolean} YES to receive additional mouse events, NO otherwise
  */
  mouseDown: function(evt) {},

  /**
    Called when the mouse is released.

    @param evt {SC.Event} the mouseup event
    @returns {Boolean} YES to handle the mouseUp, NO to allow click() and doubleClick() to be called
  */
  mouseUp: function(evt) {},

  /**
    Called when the mouse is dragged, after responding `YES` to a previous `mouseDown`:
    call.

    @param evt {SC.Event} the mousemove event
    @returns {void}
  */
  mouseDragged: function(evt) {},

  /**
    Called when the mouse exits the view and the root responder is not in a
    drag session.

    @param evt {SC.Event} the mousemove event
    @returns {void}
  */
  mouseExited: function(evt) {},

  /**
    Called when the mouse enters the view and the root responder is not in a
    drag session.

    @param evt {SC.Event} the mousemove event
    @returns {void}
  */
  mouseEntered: function(evt) {},

  /**
    Called when the mouse moves within the view and the root responder is not in a
    drag session.

    @param evt {SC.Event} the mousemove event
    @returns {void}
  */
  mouseMoved: function(evt) {},


  /**
    Called when a selectstart event in IE is triggered. **ONLY IE**
    We use it to disable IE accelerators and text selection

    @param evt {SC.Event} the selectstart event
    @returns {void}
  */
  selectStart: function(evt) {},

  /**
     Called when a contextmenu event is triggered. Used to disable contextmenu
     per view.

     @param evt {SC.Event} the contextmenu event
     @returns {void}
   */
  contextMenu: function(evt) {},

  // .......................................................................
  // Event Handlers
  //
  // These methods are called by the input manager in response to keyboard
  // events.  Most of these methods are defined here for you, but not actually
  // implemented in code.

  /**
    Insert the text or act on the key.

    @param {String} the text to insert or respond to
    @returns {Boolean} YES if you handled the method; NO otherwise
  */
  insertText: function(text) {},

  /**
    When the user presses a key-combination event, this will be called so you
    can run the command.

    @param charCode {String} the character code
    @param evt {SC.Event} the keydown event
    @returns {Boolean} YES if you handled the method; NO otherwise
  */
  performKeyEquivalent: function(charCode, evt) { return false; },

  /**
    This method is called if no other view in the current view hierarchy is
    bound to the escape or command-. key equivalent.  You can use this to
    cancel whatever operation is running.

    @param sender {Object} the object that triggered; may be null
    @param evt {SC.Event} the event that triggered the method
    @returns {Boolean} YES if you handle the event; NO otherwise
  */
  cancel: function(sender, evt) {},

  /**
    Delete the current selection or delete one element backward from the
    current selection.

    @param sender {Object} the object that triggered the method; may be null
    @param evt {SC.Event} the event that triggered the method; may be null
    @returns {Boolean} YES if you handle the event; NO otherwise
  */
  deleteBackward: function(sender, evt) {},

  /**
    Delete the current selection or delete one element forward from the
    current selection.

    @param sender {Object} the object that triggered the method; may be null
    @param evt {SC.Event} the event that triggered the method; may be null
    @returns {Boolean} YES if you handle the event; NO otherwise
  */
  deleteForward: function(sender, evt) {},

  /**
    A field editor might respond by selecting the field before it.

    @param sender {Object} the object that triggered the method; may be null
    @param evt {SC.Event} the event that triggered the method; may be null
    @returns {Boolean} YES if you handle the event; NO otherwise
  */
  insertBacktab: function(sender, evt) {},

  /**
    Insert a newline character or end editing of the receiver.

    @param sender {Object} the object that triggered the method; may be null
    @param evt {SC.Event} the event that triggered the method; may be null
    @returns {Boolean} YES if you handle the event; NO otherwise
  */
  insertNewline: function(sender, evt) {},

  /**
    Insert a tab or move forward to the next field.

    @param sender {Object} the object that triggered the method; may be null
    @param evt {SC.Event} the event that triggered the method; may be null
    @returns {Boolean} YES if you handle the event; NO otherwise
  */
  insertTab: function(sender, evt) {},

  /**
    Move insertion point/selection backward one. (i.e. left arrow key)

    @param sender {Object} the object that triggered the method; may be null
    @param evt {SC.Event} the event that triggered the method; may be null
    @returns {Boolean} YES if you handle the event; NO otherwise
  */
  moveLeft: function(sender, evt) {},

  /**
    Move the insertion point/selection forward one (i.e. right arrow key)
    in left-to-right text, this could be the left arrow key.

    @param sender {Object} the object that triggered the method; may be null
    @param evt {SC.Event} the event that triggered the method; may be null
    @returns {Boolean} YES if you handle the event; NO otherwise
  */
  moveRight: function(sender, evt) {},

  /**
    Move the insertion point/selection up one (i.e. up arrow key)

    @param sender {Object} the object that triggered the method; may be null
    @param evt {SC.Event} the event that triggered the method; may be null
    @returns {Boolean} YES if you handle the event; NO otherwise
  */
  moveUp: function(sender, evt) {},

  /**
    Move the insertion point/selection down one (i.e. down arrow key)

    @param sender {Object} the object that triggered the method; may be null
    @param evt {SC.Event} the event that triggered the method; may be null
    @returns {Boolean} YES if you handle the event; NO otherwise
  */
  moveDown: function(sender, evt) {},

  /**
    Move left, extending the selection. - shift || alt

    @param sender {Object} the object that triggered the method; may be null
    @param evt {SC.Event} the event that triggered the method; may be null
    @returns {Boolean} YES if you handle the event; NO otherwise
  */
  moveLeftAndModifySelection: function(sender, evt) {},

  /**
    Move right, extending the seleciton - shift || alt

    @param sender {Object} the object that triggered the method; may be null
    @param evt {SC.Event} the event that triggered the method; may be null
    @returns {Boolean} YES if you handle the event; NO otherwise
  */
  moveRightAndModifySelection: function(sender, evt) {},

  /**
    Move up, extending the selection - shift || alt

    @param sender {Object} the object that triggered the method; may be null
    @param evt {SC.Event} the event that triggered the method; may be null
    @returns {Boolean} YES if you handle the event; NO otherwise
  */
  moveUpAndModifySelection: function(sender, evt) {},

  /**
    Move down, extending selection - shift || alt

    @param sender {Object} the object that triggered the method; may be null
    @param evt {SC.Event} the event that triggered the method; may be null
    @returns {Boolean} YES if you handle the event; NO otherwise
  */
  moveDownAndModifySelection: function(sender, evt) {},

  /**
    Move insertion point/selection to beginning of document.

    @param sender {Object} the object that triggered the method; may be null
    @param evt {SC.Event} the event that triggered the method; may be null
    @returns {Boolean} YES if you handle the event; NO otherwise
  */
  moveToBeginningOfDocument: function(sender, evt) {},

  /**
    Move insertion point/selection to end of document.

    @param sender {Object} the object that triggered the method; may be null
    @param evt {SC.Event} the event that triggered the method; may be null
    @returns {Boolean} YES if you handle the event; NO otherwise
  */
  moveToEndOfDocument: function(sender, evt) {},

  /**
    Page down

    @param sender {Object} the object that triggered the method; may be null
    @param evt {SC.Event} the event that triggered the method; may be null
    @returns {Boolean} YES if you handle the event; NO otherwise
  */
  pageDown: function(sender, evt) {},

  /**
    Page up

    @param sender {Object} the object that triggered the method; may be null
    @param evt {SC.Event} the event that triggered the method; may be null
    @returns {Boolean} YES if you handle the event; NO otherwise
  */
  pageUp: function(sender, evt) {},

  /**
    Select all

    @param sender {Object} the object that triggered the method; may be null
    @param evt {SC.Event} the event that triggered the method; may be null
    @returns {Boolean} YES if you handle the event; NO otherwise
  */
  selectAll: function(sender, evt) {}

};

/* >>>>>>>>>> BEGIN source/render_delegates/button.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


/**
  Renders and updates the HTML representation of a button.
*/
SC.BaseTheme.buttonRenderDelegate = SC.RenderDelegate.create({
  className: 'button',

  //
  // SIZE DEFINITIONS
  //
  'sc-small-size': {
    height: 18,
    autoResizePadding: { width: 15, height: 0 }
  },

  'sc-regular-size': {
    height: 24,
    autoResizePadding: { width: 20, height: 0 }
  },

  'sc-huge-size': {
    height: 30,
    autoResizePadding: { width: 30, height: 0 }
  },

  'sc-jumbo-size': {
    height: 44,
    autoResizePadding: { width: 50, height: 0 }
  },


  //
  // RENDERING LOGIC
  //

  /**
    Called when we need to create the HTML that represents the button.

    @param {SC.Object} dataSource the object containing the information on how to render the button
    @param {SC.RenderContext} context the render context instance
  */
  render: function(dataSource, context) {
    this.addSizeClassName(dataSource, context);

    var toolTip     = dataSource.get('toolTip'),
      isSelected  = dataSource.get('isSelected') || NO,
      isActive    = dataSource.get('isActive') || NO,
      isDefault   = dataSource.get('isDefault') || NO,
      isCancel    = dataSource.get('isCancel') || NO,
      isToggle    = (dataSource.get('buttonBehavior') === SC.TOGGLE_BEHAVIOR),
      labelId     = SC.guidFor(dataSource) + '-label';

    context.setClass({
      'icon': !!dataSource.get('icon'),
      'def':  isDefault,
      'cancel': isCancel && !isDefault,
      'active': isActive,
      'sel': isSelected
    });

    // Set the toolTip.
    if (toolTip) {
      context.setAttr('title', toolTip);
    }

    this.includeSlices(dataSource, context, SC.THREE_SLICE);
    // accessibility
    if(dataSource.get('isSegment')){
      context.setAttr('aria-selected', isSelected.toString());
    }else if(isToggle) {
      context.setAttr('aria-pressed', isActive.toString());
    }

    context.setAttr('aria-labelledby', labelId);

    // Create the inner label element that contains the text and, optionally,
    // an icon.
    context = context.begin('label').addClass('sc-button-label').id(labelId);
    dataSource.get('theme').labelRenderDelegate.render(dataSource, context);
    context = context.end();

    if (dataSource.get('supportFocusRing')) {
      context = context.begin('div').addClass('focus-ring');
      this.includeSlices(dataSource, context, SC.THREE_SLICE);
      context = context.end();
    }
  },

  /**
    Called when one or more display properties have changed and we need to
    update the HTML representation with the new values.

    @param {SC.Object} dataSource the object containing the information on how to render the button
    @param {SC.RenderContext} jquery the jQuery object representing the HTML representation of the button
  */
  update: function(dataSource, jquery) {
    var isToggle = (dataSource.get('buttonBehavior') === SC.TOGGLE_BEHAVIOR),
      isDefault = dataSource.get('isDefault'),
      isCancel = dataSource.get('isCancel'),
      toolTip = dataSource.get('toolTip');

    this.updateSizeClassName(dataSource, jquery);

    if (dataSource.get('isActive')) {
      jquery.addClass('active');
    }

    if (dataSource.get('isSegment')) {
      jquery.attr('aria-selected', dataSource.get('isSelected').toString());
    } else if (isToggle) {
      jquery.attr('aria-pressed', dataSource.get('isActive').toString());
    }

    // Update the toolTip.
    if (toolTip) {
      jquery.attr('title', toolTip);
    } else {
      jquery.removeAttr('title');
    }

    jquery.setClass('icon', !!dataSource.get('icon'));
    jquery.setClass('def', !!isDefault);
    jquery.setClass('cancel', !!isCancel && !isDefault);

    dataSource.get('theme').labelRenderDelegate.update(dataSource, jquery.find('label'));
  },

  /**
    Returns the layer to be used for auto resizing.
  */
  getRenderedAutoResizeLayer: function(dataSource, jq) {
    return jq.find('.sc-button-label')[0];
  }
});

/* >>>>>>>>>> BEGIN source/render_delegates/checkbox.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


/**
  Renders and updates DOM representations of a checkbox (just the box,
  not the title).

  Note: most of the actual rendering is done in CSS. The DOM element provided
  to the checkboxRenderDelegate must have the theme class names and the
  class name 'checkbox' (the name of the render delegate).

  Parameters
  --------------------------
  Expects these properties on the data source:

   - `isSelected`
   - `isActive`
   - `title`

  Optional parameters include all parameters for the `labelRenderDelegate`.

*/
SC.BaseTheme.checkboxRenderDelegate = SC.RenderDelegate.create({
  className: 'checkbox',

  render: function(dataSource, context) {
    this.addSizeClassName(dataSource, context);

    var theme = dataSource.get('theme'),
      labelId;

    // the label id is used so we can set the aria labelledby attribute
    labelId = SC.guidFor(dataSource) + "-label";

    var isSelected = dataSource.get('isSelected') || NO;
    var isActive = dataSource.get('isActive');

    var ariaIsSelected;
    if (isSelected === SC.MIXED_STATE) ariaIsSelected = 'mixed';
    else if (isSelected) ariaIsSelected = 'true';
    else ariaIsSelected = 'false';

    context.setAttr('role', 'checkbox');
    context.setAttr('aria-checked', ariaIsSelected);
    context.setAttr('aria-labelledby', labelId);

    context.setClass({
      'sel': isSelected,
      'active': isActive
    });

    context.push('<span class = "button"></span>');

    context = context.begin('span').addClass('label').id(labelId);
    theme.labelRenderDelegate.render(dataSource, context);
    context = context.end();
  },

  update: function(dataSource, jquery) {
    this.updateSizeClassName(dataSource, jquery);

    var theme = dataSource.get('theme');

    var isSelected = dataSource.get('isSelected');
    var isActive = dataSource.get('isActive');

    var ariaIsSelected;
    if (isSelected === SC.MIXED_STATE) ariaIsSelected = 'mixed';
    else if (isSelected) ariaIsSelected = 'true';
    else ariaIsSelected = 'false';

    // address accessibility
    jquery.attr('aria-checked', ariaIsSelected);

    // NOTE: the other properties were already set in render, and should not
    // need to be changed.

    theme.labelRenderDelegate.update(dataSource, jquery.find('span.label'));

    // add class names
    jquery.setClass({
      'sel': isSelected,
      'active': isActive
    });
  }
});



/* >>>>>>>>>> BEGIN source/render_delegates/collection.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


// collections don't need their own rendering; however, in future, constants
// like the row height will likely be specified on the render delegate.
SC.BaseTheme.collectionRenderDelegate = SC.RenderDelegate.create({
  className: 'collection',

  render: function(dataSource, context) {
    context.setClass('active', dataSource.get('isActive'));
  },

  update: function(dataSource, jquery) {
    jquery.setClass('active', dataSource.get('isActive'));
  }
});

/* >>>>>>>>>> BEGIN source/render_delegates/disclosure.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


SC.BaseTheme.disclosureRenderDelegate = SC.RenderDelegate.create({
  className: 'disclosure',

  render: function(dataSource, context) {
    this.addSizeClassName(dataSource, context);

    var theme = dataSource.get('theme'),
        value = dataSource.get('value'),
        labelClassNames = ['sc-button-label', 'sc-disclosure-label'];

    var labelId = SC.guidFor(dataSource) + "-label";

    //addressing accessibility
    context.setAttr('aria-expanded', value);
    context.setAttr('aria-labelledby', labelId);

    if (dataSource.get('isSelected')) context.addClass('sel');

    var state = '';
    state += dataSource.get('isSelected') ? 'open' : 'closed';
    if (dataSource.get('isActive')) state += ' active';

    context.push('<img src = "' + SC.BLANK_IMAGE_URL + '" class = "disclosure button ' + state + '" />');

    context = context.begin('span').addClass(labelClassNames).id(labelId);
    theme.labelRenderDelegate.render(dataSource, context);
    context = context.end();
  },

  update: function(dataSource, jquery) {
    this.updateSizeClassName(dataSource, jquery);

    var theme = dataSource.get('theme'),
        value = dataSource.get('value');

    //addressing accessibility
    jquery.attr('aria-expanded', value);

    if (dataSource.get('isSelected')) jquery.addClass('sel');

    jquery.find('img').setClass({
      open: dataSource.get('isSelected'),
      closed: !dataSource.get('isSelected'),
      active: dataSource.get('isActive')
    });

    theme.labelRenderDelegate.update(dataSource, jquery.find('span.sc-disclosure-label'));
  }
});


/* >>>>>>>>>> BEGIN source/render_delegates/helpers/slicing.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


SC.THREE_SLICE = ['left', 'middle', 'right'];

SC.NINE_SLICE = [
  'top-left', 'top', 'top-right', 
  'left', 'middle', 'right', 
  'bottom-left', 'bottom', 'bottom-right'
];

SC.RenderDelegate.reopen({
  /*@scope SC.RenderDelegate.prototype*/
  
  /**
    Use this to render slices that you can match in CSS. This matches with the
    Chance @include slices directive, so that you can automatically do 
    multi-slice images for controls.

    @param {SC.Object} dataSource The data source for rendering information.
    @param {SC.RenderContext} context the render context instance
    @param {Slice Configuration} slices Instructions on how to slice. Can be a constant
    like SC.THREE_SLICE or SC.NINE_SLICE, or an array of slice names.
  */
  includeSlices: function(dataSource, context, slices) {
    for (var idx = 0, len = slices.length; idx < len; idx++) {
      context.push('<div class="' + slices[idx] + '"></div>');
    }
  }
});

/* >>>>>>>>>> BEGIN source/render_delegates/image_button.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


SC.BaseTheme.imageButtonRenderDelegate = SC.RenderDelegate.create({
  className: 'image-button',

  render: function (dataSource, context) {
    var image = dataSource.get('image'),
      toolTip = dataSource.get('toolTip');

    // render controlSize
    this.addSizeClassName(dataSource, context);

    if (toolTip) {
      context.setAttr('title', toolTip);
      context.setAttr('alt', toolTip);
    }

    if (image) {
      context.addClass(image);

      // Track the image class used so that we can remove it when it changes.
      dataSource.renderState._cachedImage = image;
    }
  },

  update: function (dataSource, jqElement) {
    var image, toolTip;

    this.updateSizeClassName(dataSource, jqElement);

    if (dataSource.didChangeFor('imageButtonRenderDelegate', 'toolTip')) {
      toolTip = dataSource.get('toolTip');

      jqElement.attr('title', toolTip);
      jqElement.attr('alt', toolTip);
    }

    if (dataSource.didChangeFor('imageButtonRenderDelegate', 'image')) {
      image = dataSource.get('image');

      // Remove the last image class
      if (dataSource.renderState._cachedImage) {
        jqElement.removeClass(dataSource.renderState._cachedImage);
      }

      if (image) {
        jqElement.addClass(image);

        // Track the image class used so that we can remove it when it changes.
        dataSource.renderState._cachedImage = image;
      }
    }
  }
});

/* >>>>>>>>>> BEGIN source/render_delegates/master_detail.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


/**
  Border between the two panes of the MasterDetail.

  Note that the border does *NOT* include any space on the sides. Space
  on left or right sides of MasterDetail, if any, should be handled by
  its layout.
 */
SC.BaseTheme.MASTER_DETAIL_DIVIDER_WIDTH = 1;

SC.BaseTheme.masterDetailRenderDelegate = SC.RenderDelegate.create({
  className: 'master-detail',
  dividerWidth: 1,
  
  render: function(dataSource, context) {
    context.setClass('round-toolbars', SC.platform.touch);
  },
  
  update: function(dataSource, jquery) {
    jquery.setClass('round-toolbars', SC.platform.touch);    
  }
  
});

/* >>>>>>>>>> BEGIN source/render_delegates/panel.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


SC.BaseTheme.panelRenderDelegate = SC.RenderDelegate.create({
  className: 'panel',

  render: function(dataSource, context) {
    context = context.begin('div').addClass('panel-background');
    this.includeSlices(dataSource, context, SC.NINE_SLICE);
    context = context.end();

    var ariaLabel = dataSource.get('ariaLabel'),
        ariaLabelledBy = dataSource.get('ariaLabelledBy'),
        ariaDescribedBy = dataSource.get('ariaDescribedBy');

    if (ariaLabel) context.setAttr('aria-label', ariaLabel);
    if (ariaLabelledBy) context.setAttr('aria-labelledby', ariaLabelledBy);
    if (ariaDescribedBy) context.setAttr('aria-describedby', ariaDescribedBy);
  },

  update: function(dataSource, jQuery) {
    // the label for the panel could change...
    var ariaLabel = dataSource.get('ariaLabel'),
        ariaLabelledBy = dataSource.get('ariaLabelledBy'),
        ariaDescribedBy = dataSource.get('ariaDescribedBy');

    if(ariaLabel) jQuery.attr('aria-label', ariaLabel);
    if(ariaLabelledBy) jQuery.attr('aria-labelledby', ariaLabelledBy);
    if(ariaDescribedBy) jQuery.attr('aria-describedby', ariaDescribedBy);
  }
});

/* >>>>>>>>>> BEGIN source/render_delegates/picker.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('render_delegates/panel');

SC.BaseTheme.pickerRenderDelegate = SC.RenderDelegate.create({
  className: 'picker',

  render: function (dataSource, context) {
    var panelRenderDelegate = dataSource.get('theme').panelRenderDelegate;

    panelRenderDelegate.render(dataSource, context);

    var preferType = dataSource.get('preferType'),
      pointerPosition = dataSource.get('pointerPos');

    if (preferType == SC.PICKER_POINTER || preferType == SC.PICKER_MENU_POINTER) {
      context.push('<div class="sc-pointer ' + pointerPosition + '"></div>');
      context.addClass(pointerPosition);

      // Track the last pointerPosition used so that we can remove it when it changes.
      dataSource.renderState._lastPointerPosition = pointerPosition;
    }
  },

  update: function (dataSource, $) {
    var panelRenderDelegate = dataSource.get('theme').panelRenderDelegate;

    panelRenderDelegate.update(dataSource, $);

    var preferType = dataSource.get('preferType'),
      pointerPosition = dataSource.get('pointerPos');

    if (preferType == SC.PICKER_POINTER || preferType == SC.PICKER_MENU_POINTER) {
      var lastPointerPosition = dataSource.renderState._lastPointerPosition;

      if (lastPointerPosition !== pointerPosition) {
        var el = $.find('.sc-pointer');

        // Totally overwrite the pointer class.
        el.attr('class', "sc-pointer " + pointerPosition);

        // Update the view layer class
        $.removeClass(lastPointerPosition);
        $.addClass(pointerPosition);

        // Track the last pointerPosition used so that we can remove it when it changes.
        dataSource.renderState._lastPointerPosition = pointerPosition;
      }
    }

  }
});

/* >>>>>>>>>> BEGIN source/render_delegates/menu.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('render_delegates/picker');

// This is the same as a pickerRenderDelegate, but is named 'menu' instead.
SC.BaseTheme.menuRenderDelegate = SC.BaseTheme.pickerRenderDelegate.create({
  className: 'menu',

  render: function(orig, dataSource, context) {
    this.addSizeClassName(dataSource, context);
    orig(dataSource, context);
  }.enhance(),

  update: function(orig, dataSource, jquery) {
    this.updateSizeClassName(dataSource, jquery);
    orig(dataSource, jquery);
  }.enhance(),

  // height for items in this menu size
  itemHeight: 20,

  // height of separator items
  itemSeparatorHeight: 9,

  // amount to add to the calculated menu height
  menuHeightPadding: 6,

  // amount to add to any calculated menu width to determine the actual width
  menuWidthPadding: 50,

  minimumMenuWidth: 50,

  submenuOffsetX: 2,
  verticalOffset: 23,

  'sc-tiny-size': {
    itemHeight: 10,
    itemSeparatorHeight: 2,
    menuHeightPadding: 2,
    submenuOffsetX: 0
  },

  'sc-small-size': {
    itemHeight: 16,
    itemSeparatorHeight: 7,
    menuHeightPadding: 4,
    submenuOffsetX: 2
  },

  'sc-large-size': {
    itemHeight: 60,
    itemSeparatorHeight: 20,
    menuHeightPadding: 0,
    submenuOffsetX: 4
  },

  // pretty sure these sizes are wrong, but I copied them from their original
  // values so... please fix.
  'sc-huge-size': {
    itemHeight: 20,
    itemSeparatorHeight: 9,
    menuHeightPadding: 0,
    submenuOffsetX: 0
  }
});

/* >>>>>>>>>> BEGIN source/render_delegates/popup_button.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


/**
 * Renders and updates the HTML representation of a popup button.
 */
SC.BaseTheme.popupButtonRenderDelegate = SC.BaseTheme.buttonRenderDelegate.create({
  render: function(dataSource, context) {
    context.setAttr('aria-haspopup', 'true');
    arguments.callee.base.apply(this,arguments);
  },

  update: function(dataSource, jQuery) {
    arguments.callee.base.apply(this,arguments);
  }
});

/* >>>>>>>>>> BEGIN source/render_delegates/progress.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

SC.BaseTheme.PROGRESS_OFFSET = 0.5;
SC.BaseTheme.PROGRESS_OFFSET_RANGE = 42;

/**
 Renders and updates DOM representations of progress bars.

 Parameters
 --------------------------
 Expects these properties on the data source:

 - `isIndeterminate`
 - `isRunning`
 - `isVisibleInWindow`
 - `value`

 Theme Constants
 -------------------------------------
 Ace's `progressRenderDelegate`'s rendering process is not affected by
 any theme constants.
 */
SC.BaseTheme.progressRenderDelegate = SC.RenderDelegate.create({
  className:'progress',

  render:function (dataSource, context) {
    this.addSizeClassName(dataSource, context);

    var isIndeterminate = dataSource.get('isIndeterminate'),
      theme = dataSource.get('theme'),
      valueMax = dataSource.get('maximum'),
      valueMin = dataSource.get('minimum'),
      valueNow = dataSource.get('ariaValue');

    var value;
    if (isIndeterminate) {
      value = 1;
    } else {
      value = dataSource.get('value');
    }

    // make accessible
    context.setAttr('aria-valuemax', valueMax);
    context.setAttr('aria-valuemin', valueMin);
    context.setAttr('aria-valuenow', valueNow);
    context.setAttr('aria-valuetext', valueNow);

    context.setClass({
      indeterminate:isIndeterminate,
      running:dataSource.get('isRunning') && isIndeterminate,
      'sc-empty':(value <= 0),
      'sc-complete':(value >= 1 && !isIndeterminate)
    });

    context = context.begin('div').addClass('track');
    this.includeSlices(dataSource, context, SC.THREE_SLICE);
    context = context.end();

    context = context.begin('div').addClass('content');
    context.setStyle('width', (value * 100) + "%");
    this.includeSlices(dataSource, context, SC.THREE_SLICE);
    context = context.end();
  },

  update:function (dataSource, jQuery) {
    this.updateSizeClassName(dataSource, jQuery);

    var theme = dataSource.get('theme'),
      value,
      valueMax = dataSource.get('maximum'),
      valueMin = dataSource.get('minimum'),
      valueNow = dataSource.get('ariaValue'),
      isIndeterminate = dataSource.get('isIndeterminate'),
      isRunning = dataSource.get('isRunning'),
      isVisibleInWindow = dataSource.get('isVisibleInWindow');

    // make accessible
    jQuery.attr('aria-valuemax', valueMax);
    jQuery.attr('aria-valuemin', valueMin);
    jQuery.attr('aria-valuenow', valueNow);
    jQuery.attr('aria-valuetext', valueNow);

    if (isIndeterminate) {
      value = 1;
    } else {
      value = dataSource.get('value');
    }

    jQuery.setClass({
      indeterminate:isIndeterminate,
      running:isRunning && isIndeterminate,
      'sc-empty':(value <= 0),
      'sc-complete':(value >= 1 && !isIndeterminate)
    });

    jQuery.find('.content').css('width', (value * 100) + "%");

    // fallback for browsers that don't support css transitions
    if(!SC.platform.supportsCSSTransitions) {
      if (!this._queue[jQuery[0].id]) {
        this._queue[jQuery[0].id] = {
          offset:0,
          element:SC.$(jQuery).find('.content .middle'),
          shouldAnimate:false
        };
      }

      if (isIndeterminate && isRunning && isVisibleInWindow) {
        // save offset in the queue and request animation
        this._queue[jQuery[0].id].shouldAnimate = true;
        this.animate(dataSource);
      } else if (!isIndeterminate) {
        // Clear out our custom background-position when isIndeterminate toggles.
        this._queue[jQuery[0].id].element.css('background-position', '');
      } else {
        this._queue[jQuery[0].id].shouldAnimate = false;
      }
    }
  },

  /** @private Queue of objects to animate: { id, offset, element } */
  _queue: {},

  /** @private Catch double calls to _animate */
  _animating: false,

  /**
    Animates the indeterminate progress view's middle background using
    JavaScript and requestAnimationFrame().
  */
  animate: function (dataSource) {
    var self = this;

    // avoid invoking the animation code multiple times if more than
    // one progress bar needs animating *and* one has already started the loop
    if (this._animating) {
      return;
    }

    function _animate() {
      var offset,
        lastOffset,
        roundedOffset,
        viewsToAnimate = self._queue,
        animations = 0,
        params;

      var id;
      for (id in viewsToAnimate) {
        if (viewsToAnimate.hasOwnProperty(id)) {
          params=viewsToAnimate[id];
          if (params.shouldAnimate) {
            self._animating = true;
            animations++;
            lastOffset = params.offset || 0;
            offset = (lastOffset + SC.BaseTheme.PROGRESS_OFFSET) % SC.BaseTheme.PROGRESS_OFFSET_RANGE;

            // Only update the style when the offset changes (this avoids making
            // the browser recalculate style in each frame).
            roundedOffset = Math.round(offset);
            if (roundedOffset > Math.round(lastOffset)) {
              params.element.css('background-position', roundedOffset + "px 0px");
            }

            params.offset = offset;
          }
        }
      }

      if (animations === 0) {
        self._animating = false;
      } else {
        window.requestAnimationFrame(_animate);
      }
    }

    // Start the animation.
    _animate();
  }
});

/* >>>>>>>>>> BEGIN source/render_delegates/radio.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/**
  Renders and updates the DOM representation of a radio button (a single button,
  not the group).

  Expected Properties
  -----------------------------------

   - `isSelected`
   - `isActive`
   - `isMixed`
   - `title`

  Optional Properties
  -----------------------------------

   - `width` -- an optional width of the radio button
   - `labelRenderDelegate` properties

*/
SC.BaseTheme.radioRenderDelegate = SC.RenderDelegate.create({
  className: 'radio',

  render: function(dataSource, context) {
    this.addSizeClassName(dataSource, context);

    var theme = dataSource.get('theme');

    var isSelected = dataSource.get('isSelected'),
        width = dataSource.get('width'),
        labelId = SC.guidFor(dataSource) + '-label';

    context.setClass({
      active: dataSource.get('isActive'),
      mixed: dataSource.get('isMixed'),
      sel: dataSource.get('isSelected'),
      disabled: !dataSource.get('isEnabled')
    });

    //accessing accessibility
    context.setAttr('role', 'radio');
    context.setAttr('aria-checked', isSelected);
    context.setAttr('aria-labelledby', labelId);
    context.setAttr('aria-disabled', dataSource.get('isEnabled') ? 'false' : 'true');

    if (width) context.setStyle('width', width);

    context.push('<span class = "button"></span>');

    context = context.begin('span').addClass('sc-button-label').id(labelId);
    theme.labelRenderDelegate.render(dataSource, context);
    context = context.end();
  },

  update: function(dataSource, jquery) {
    this.updateSizeClassName(dataSource, jquery);

    var theme = dataSource.get('theme');

    var isSelected = dataSource.get('isSelected'),
        width = dataSource.get('width'),
        value = dataSource.get('value');

    jquery.setClass({
      active: dataSource.get('isActive'),
      mixed: dataSource.get('isMixed'),
      sel: dataSource.get('isSelected'),
      disabled: !dataSource.get('isEnabled')
    });

    jquery.attr('aria-disabled', dataSource.get('isEnabled') ? 'false' : 'true');
    jquery.attr('aria-checked', isSelected);
    jquery.css('width', width ? width : null);

    theme.labelRenderDelegate.update(dataSource, jquery.find('.sc-button-label'));
  }
});

/* >>>>>>>>>> BEGIN source/render_delegates/radio_group.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


/**
  @class
  Renders and updates the HTML representation of a group of radio buttons.

  Expects Properties
  -------------------------------

   - `items` -- a collection of data sources for radioRenderDelegates
   - `layoutDirection`
   - `isEnabled`

  Extended API
  --------------------------------
  As this encompasses an entire group, it must provide a way to determine
  which radio button is the target of an event. The indexForEvent method
  does exactly this, and all radioGroupRenderDelegates _must_ support it.

  Also, as it would be low-performance to update any but the changed radio
  button, there is a method to update a specific index.
*/
SC.BaseTheme.radioGroupRenderDelegate = SC.RenderDelegate.create({
  className: 'radio-group',

  render: function(dataSource, context) {
    this.addSizeClassName(dataSource, context);

    var theme = dataSource.get('theme'),
        name = SC.guidFor(this),
        items = dataSource.get('items'), idx, len = items.length, item;


    context.addClass(dataSource.get('layoutDirection'));
    context.setAttr('role', 'radiogroup');
    context.setAttr('aria-disabled', dataSource.get('isEnabled') ? 'false' : 'true');

    for (idx = 0; idx < len; idx++) {
      item = items[idx];
      context = context.begin('div')
        .addClass('radio-' + idx)
        .setAttr('index', idx)
        .addClass(theme.classNames)
        .addClass(theme.radioRenderDelegate.className)

        // so we can identify it in event handling
        .addClass('sc-radio-button');

      theme.radioRenderDelegate.render(item, context);

      context = context.end();
    }

    // store the radio count so we can know when to regenerate in update
    dataSource.get('renderState').radioCount = idx;
  },

  update: function(dataSource, jquery) {
    this.updateSizeClassName(dataSource, jquery);

    var theme = dataSource.get('theme'),
        name = SC.guidFor(this),
        items = dataSource.get('items'), idx, len = items.length, item;

    jquery.addClass(dataSource.get('layoutDirection'));
    jquery.attr('aria-disabled', dataSource.get('isEnabled') ? 'false' : 'true');

    if (dataSource.get('renderState').radioCount !== len) {
      // just regenerate if the count has changed. It would be better
      // to be intelligent, but that would also be rather complex
      // for such a rare case.
      var context = SC.RenderContext(jquery[0]);
      this.render(dataSource, context);
      context.update();
      return;
    }

    for (idx = 0; idx < len; idx++) {
      item = items[idx];
      theme.radioRenderDelegate.update(item, jquery.find('.radio-' + idx));
    }
  },

  /**
    Updates the radio button at the specified index.

    @param {Object} dataSource The RenderDelegate data source.
    @param {jQuery} jquery A jQuery instance with the DOM for this radio group.
    @param {Number} index The index of the radio to update.
  */
  updateRadioAtIndex: function(dataSource, jquery, index) {
    var item = dataSource.get('items')[index];
    dataSource.get('theme').radioRenderDelegate.update(item, jquery.find('.radio-' + index));
  },

  /**
    Returns the index of the radio button that was the target of the
    supplied event.

    @param {Object} dataSource The RenderDelegate data source.
    @param {jQuery} jquery A jQuery instance with the DOM for this radio group.
    @param {SC.Event SC.Touch} event The event or SC.Touch object.
  */

  indexForEvent: function(dataSource, jquery, evt) {
    var index = $(evt.target).closest('.sc-radio-button').attr('index');
    if (isNaN(index)) return undefined;
    return parseInt(index, 0);
  }
});

/* >>>>>>>>>> BEGIN source/render_delegates/segment.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


/**
  Renders and updates the HTML representation of a segment child view within
  SC.SegmentedView.
*/
SC.BaseTheme.segmentRenderDelegate = SC.RenderDelegate.create({
  className: 'segment',

  render: function (dataSource, context) {
    var theme = dataSource.get('theme'),
        buttonDelegate,
        classes;

    // Segment specific additions
    classes = {
      'sc-first-segment': dataSource.get('isFirstSegment'),
      'sc-middle-segment': dataSource.get('isMiddleSegment'),
      'sc-last-segment': dataSource.get('isLastSegment'),
      'sc-overflow-segment': dataSource.get('isOverflowSegment'),
      'vertical': dataSource.get('layoutDirection') !== SC.LAYOUT_HORIZONTAL
    };

    if (!SC.none(dataSource.get('index'))) classes['sc-segment-' + dataSource.get('index')] = YES;
    context.setClass(classes);

    // Use the SC.ButtonView render delegate for the current theme to render the segment as a button
    buttonDelegate = theme.buttonRenderDelegate;
    buttonDelegate.render(dataSource, context);
  },

  update: function (dataSource, jquery) {
    var theme = dataSource.get('theme'),
        buttonDelegate,
        classes = {};

    // Segment specific additions
    classes = {
      'sc-first-segment': dataSource.get('isFirstSegment'),
      'sc-middle-segment': dataSource.get('isMiddleSegment'),
      'sc-last-segment': dataSource.get('isLastSegment'),
      'sc-overflow-segment': dataSource.get('isOverflowSegment') || NO,
      'vertical': dataSource.get('layoutDirection') !== SC.LAYOUT_HORIZONTAL
    };
    if (!SC.none(dataSource.get('index'))) classes['sc-segment-' + dataSource.get('index')] = YES;
    jquery.setClass(classes);

    // Use the SC.ButtonView render delegate for the current theme to update the segment as a button
    buttonDelegate = theme.buttonRenderDelegate;
    buttonDelegate.update(dataSource, jquery);
  }

});

/* >>>>>>>>>> BEGIN source/render_delegates/segmented.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/**
  Renders and updates the HTML representation of SC.SegmentedView.
*/
SC.BaseTheme.segmentedRenderDelegate = SC.RenderDelegate.create({
  className: 'segmented',

  /*
    We render everything external to the segments and let each segment use it's own render
    delegate to render its contents.

    */
  render: function(dataSource, context) {
    // Use text-align to align the segments
    this.addSizeClassName(dataSource, context);
    context.addStyle('text-align', dataSource.get('align'));
  },

  update: function(dataSource, jquery) {
    this.updateSizeClassName(dataSource, jquery);
    jquery.css('text-align', dataSource.get('align'));
  }

});

/* >>>>>>>>>> BEGIN source/render_delegates/slider.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licened under MIT license (see license.js)
// ==========================================================================

/**
  Renders and updates the DOM representation of a slider.

  Parameters
  -------------------------
  Requires the following parameters:

   - `value` -- a value from 0 to 1.
   - `frame` -- containing the frame in which the slider is being drawn.
*/

SC.BaseTheme.sliderRenderDelegate = SC.RenderDelegate.create({

  className: 'slider',

  render: function(dataSource, context) {
    this.addSizeClassName(dataSource, context);

    var blankImage = SC.BLANK_IMAGE_URL,
        valueMax    = dataSource.get('maximum'),
        valueMin    = dataSource.get('minimum'),
        valueNow    = dataSource.get('ariaValue');

    //addressing accessibility
    context.setAttr('aria-valuemax', valueMax);
    context.setAttr('aria-valuemin', valueMin);
    context.setAttr('aria-valuenow', valueNow);
    if(valueMin !== 0 || valueMax !== 100) context.setAttr('aria-valuetext', valueNow);
    context.setAttr('aria-orientation', 'horizontal');

    context = context.begin('span').addClass('track');
    this.includeSlices(dataSource, context, SC.THREE_SLICE);
    context.push(
      '<img src="' + blankImage +
      '" class="sc-handle" style="left: '+ dataSource.get('value') + '%" />'+
      '</span>'
    );

    context = context.end();



    dataSource.get('renderState')._cachedHandle = null;
  },

  update: function(dataSource, jquery) {
    this.updateSizeClassName(dataSource, jquery);

    var valueMax    = dataSource.get('maximum'),
        valueMin    = dataSource.get('minimum'),
        valueNow    = dataSource.get('ariaValue');

    //addressing accessibility
    jquery.attr('aria-valuemax', valueMax);
    jquery.attr('aria-valuemin', valueMin);
    jquery.attr('aria-valuenow', valueNow);
    if(valueMin !== 0 || valueMax !== 100) jquery.attr('aria-valuetext', valueNow);
    jquery.attr('aria-orientation', 'horizontal');

    if (dataSource.didChangeFor('sliderRenderDelegate', 'value')) {
      var handle = dataSource.get('renderState')._cachedHandle;
      if (!handle) {
        handle = dataSource.get('renderState')._cachedHandle = jquery.find('.sc-handle');
      }

      var frame = dataSource.get('frame'), value = dataSource.get('value');
      handle.css('left', value + "%");
    }
  }

});

/* >>>>>>>>>> BEGIN source/render_delegates/source_list.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

SC.BaseTheme.SourceList = SC.BaseTheme.subtheme('source-list');
/* >>>>>>>>>> BEGIN source/render_delegates/split.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2010 Sprout Systems, Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

SC.BaseTheme.splitRenderDelegate = SC.RenderDelegate.create({
  className: 'split',

  render: function(dataSource, context) {
    context.addClass(dataSource.get('layoutDirection'));
  },

  update: function(dataSource, jquery) {
    jquery.addClass(dataSource.get('layoutDirection'));
  }
});

/* >>>>>>>>>> BEGIN source/render_delegates/split_divider.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2010 Sprout Systems, Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

SC.BaseTheme.splitDividerRenderDelegate = SC.RenderDelegate.create({
  className: 'split-divider',
  dividerSize: 1,

  splitPositionOffset: -5,
  splitSizeOffset: 10,

  render: function(dataSource, context) {
    this.addSizeClassName(dataSource, context);

    // the divider view itself is the grabber, but the visible line
    // may be inside of it.
    context.push("<div class='line'></div>");
  },

  update: function(dataSource, jquery) {
    this.updateSizeClassName(dataSource, jquery);
  }
});

/* >>>>>>>>>> BEGIN source/render_delegates/toolbar.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

SC.BaseTheme.toolbarRenderDelegate = SC.RenderDelegate.create({
  className: 'toolbar',

  render: function(dataSource, context) {
    // toolbar has nothing in it
  },
  
  update: function() {
    // toolbar has nothing to update
  }
});

/* >>>>>>>>>> BEGIN source/render_delegates/well.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

SC.BaseTheme.wellRenderDelegate = SC.RenderDelegate.create({
  className: 'well',
  render: function(dataSource, context) {
    this.includeSlices(dataSource, context, SC.NINE_SLICE);
  },
  
  update: function() {

  }
});

/* >>>>>>>>>> BEGIN source/render_delegates/workspace.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

SC.BaseTheme.workspaceRenderDelegate = SC.RenderDelegate.create({
  className: 'workspace',
  
  render: function() {
    // No DOM to generate -- uses CSS3 to style.
  },

  update: function() {
    // No DOM to generate -- uses CSS3 to style.
  }
});
/* >>>>>>>>>> BEGIN source/system/undo_manager.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*
  TODO More docs for this class
*/

/**
  @class
  
  This is a simple undo manager.  To use this UndoManager, all you need to
  do is to make sure that you register a function with this manager to undo
  every change you make.  You can then invoke the undo/redo methods to do it.
  
  ## Using SC.UndoManager
  
  Typically you create an undo manager inside on of your controllers.  Then,
  whenever you are about to perform an action on your model object, all you
  need to do is to register a function with the undo manager that can undo 
  whatever  you just did.
  
  Besure the undo function you register also saves undo functions.  This makes
  redo possible.
  
  @extends SC.Object
*/
SC.UndoManager = SC.Object.extend(
/** @scope SC.UndoManager.prototype */ {

  /** 
    Use this property to build your Undo menu name.
    
    @field
    @type String
    @default null
  */
  undoActionName: function() { 
    return this.undoStack ? this.undoStack.name : null ;
  }.property('undoStack'),
  
  /** 
    Use this property to build your Redo menu name.
    
    @field
    @type String
    @default null
  */
  redoActionName: function() { 
    return this.redoStack ? this.redoStack.name : null ;
  }.property('redoStack'),

  /** 
    True if there is an undo action on the stack.
    
    Use to validate your menu item.
    
    @field
    @type Boolean
    @default NO
  */
  canUndo: function() { 
    // instead of this.undoStack !== null && this.undoStack !== undefined
    return this.undoStack != null;
  }.property('undoStack'),
  
  /** 
    True if there is an redo action on the stack. Use to validate your menu item.
    
    @field
    @type Boolean
    @default NO
  */
  canRedo: function() { 
    // instead of this.redoStack !== null && this.redoStack !== undefined
    return this.redoStack != null; 
  }.property('redoStack'),
  
  /**
    Tries to undo the last action. Fails if an undo group is currently open.
    
    @returns {Boolean} YES if succeeded, NO otherwise.
  */
  undo: function() {
    this._undoOrRedo('undoStack','isUndoing');
  },
  
  /**
    Tries to redo the last action. Fails if a redo group is currently open.
    
    @returns {Boolean} YES if succeeded, NO otherwise.
  */
  redo: function() {
    this._undoOrRedo('redoStack','isRedoing');
  },
  
  /**
    @type Boolean
    @default NO
  */
  isUndoing: NO,
  
  /**
    @type Boolean
    @default NO
  */
  isRedoing: NO, 
  
  /** @private */
  groupingLevel: 0,
  
  // --------------------------------
  // SIMPLE REGISTRATION
  //
  // These are the core method to register undo/redo events.
  
  /**
    This is how you save new undo events.
    
    @param {Function} func A prebound function to be invoked when the undo executes.
    @param {String} [name] An optional name for the undo.  If you are using 
      groups, this is not necessary.
  */
  registerUndo: function(func, name) {
    this.beginUndoGroup(name) ;
    this._activeGroup.actions.push(func) ;
    this.endUndoGroup(name) ;
  },

  /**
    Begins a new undo groups

    Whenever you start an action that you expect to need to bundle under a single
    undo action in the menu, you should begin an undo group.  This way any
    undo actions registered by other parts of the application will be
    automatically bundled into this one action.
    
    When you are finished performing the action, balance this with a call to
    `endUndoGroup()`.
    
    @param {String} name
  */
  beginUndoGroup: function(name) {
    // is a group already active? Just increment the counter.
    if (this._activeGroup) {
      this.groupingLevel++ ;
      
    // otherwise, create a new active group.  
    } else {
      var stack = this.isUndoing ? 'redoStack' : 'undoStack' ;
      this._activeGroup = { name: name, actions: [], prev: this.get(stack) } ;
      this.set(stack, this._activeGroup) ;
      this.groupingLevel = 1 ;
    }
  },
 
  /**
    @throws {Error} If there is no active group
    
    @param {String} name
    @see beginUndoGroup()
  */
  endUndoGroup: function(name) {
    // if more than one groups are active, just decrement the counter.
    if (!this._activeGroup) raise("endUndoGroup() called outside group.") ;
    if (this.groupingLevel > 1) {
      this.groupingLevel-- ;
      
    // otherwise, close out the current group.
    } else {
      this._activeGroup = null ; this.groupingLevel = 0 ;
    }
    this.propertyDidChange(this.isUndoing ? 'redoStack' : 'undoStack') ;
  },

  /**
    Change the name of the current undo group.
    
    Normally you don't want to do this as it will effect the whole group.
    
    @param {String} name
    
    @throws {Error} If there is no active group
  */
  setActionName: function(name) {
    if (!this._activeGroup) raise("setActionName() called outside group.") ;
    this._activeGroup.name = name ;
  },
  
  // --------------------------------
  // PRIVATE
  //
  
  /** @private */
  _activeGroup: null,
  
  /** @private */
  undoStack: null,
  
  /** @private */
  redoStack: null, 
  
  /** @private */
  _undoOrRedo: function(stack, state) {
    if (this._activeGroup) return false ;
    if (this.get(stack) == null) return true; // noting to do.

    this.set(state, true) ;
    var group = this.get(stack) ;
    this.set(stack, group.prev) ;
    var action ;

    var useGroup = group.actions.length > 1; 
    if (useGroup) this.beginUndoGroup(group.name) ;
    while(action = group.actions.pop()) { action(); }
    if (useGroup) this.endUndoGroup(group.name) ;
    
    this.set(state, false) ;
  }
  
}) ;

/* >>>>>>>>>> BEGIN source/views/checkbox.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/** @class

  Represents a Checkbox Button.

  The view is an `SC.ButtonView` put into toggle mode and with the 'theme' property
  set to "checkbox".

  Rendering
  ----------------------------
  SC.ButtonView delegates its rendering to its theme. As the theme is set
  to "checkbox", the way the checkbox renders (including DOM) will actually
  be different than SC.ButtonView's.

  @extends SC.ButtonView
  @since SproutCore 1.0
*/
SC.CheckboxView = SC.ButtonView.extend(
/** @scope SC.CheckboxView.prototype */ {

  /**
    @type Array
    @default ['sc-checkbox-view', 'sc-checkbox-control']
    @see SC.View#classNames
  */
  classNames: ['sc-checkbox-view', 'sc-checkbox-control'],

  /**
    The WAI-ARIA role of checkbox.

    @type String
    @readOnly
  */
  ariaRole: 'checkbox',

  // no special theme for Checkbox; button defaults to 'square', so we have to stop that.
  themeName: null,

  /**
    @type String
    @default 'checkboxRenderDelegate'
  */
  renderDelegateName: 'checkboxRenderDelegate',

  /**
    Ellipsis is disabled by default to allow multiline text

    @type Boolean
    @default NO
  */
  needsEllipsis: NO,

  /**
    `YES` if `isEnabledInPane` is `YES`, `NO` otherwise

    @type Boolean
    @default NO
    @observes isEnabledInPane
  */
  acceptsFirstResponder: function() {
    if (SC.FOCUS_ALL_CONTROLS) { return this.get('isEnabledInPane'); }
    return NO;
  }.property('isEnabledInPane'),

  /** @private */
  _toggleValue: function(){
    var isOn = this.get('value') === this.get('toggleOnValue');
    this.set('value', isOn ? this.get('toggleOffValue') : this.get('toggleOnValue'));
  },

  /** @private */
  mouseDown: function(evt) {
    if(!this.get('isEnabledInPane')) return YES;
    this.set('isActive', YES);
    this._isMouseDown = YES;
    if (evt && this.get('acceptsFirstResponder')) evt.allowDefault();
    return YES;
  },

  /** @private */
  mouseUp: function(evt) {
    if(!this.get('isEnabledInPane')) return YES;

    this.set('isActive', NO);
    this._isMouseDown = NO;

    // fire action
    if (this.get('buttonBehavior') !== SC.HOLD_BEHAVIOR) {
      if (this.$().within(evt.target)) {
        this._toggleValue();
        this._action(evt);
      }
    }

    return YES;

  },

  /** @private */
  keyDown: function(evt) {
    // handle tab key
    if(!this.get('isEnabledInPane')) return YES;

    if (evt.which === 9 || evt.keyCode === 9) {
      var view = evt.shiftKey ? this.get('previousValidKeyView') : this.get('nextValidKeyView');
      if(view) view.becomeFirstResponder();
      else evt.allowDefault();
      return YES ; // handled
    }

    if (evt.which === 13 || evt.which === 32) {
      this._toggleValue();

      // fire action
      if (this.get('buttonBehavior') !== SC.HOLD_BEHAVIOR) {
        if (this.$().within(evt.target)) { this._action(evt); }
      }

      return YES ; // handled
    }

    // let other keys through to browser
    evt.allowDefault();

    return NO;
  },



  /** @private */
  touchStart: function(evt) {
    return this.mouseDown(evt);
  },

  /** @private */
  touchEnd: function(evt) {
    return this.mouseUp(evt);
  }

});

/* >>>>>>>>>> BEGIN source/views/list_item.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


/**
  @static
  @constant
*/
SC.LIST_ITEM_ACTION_CANCEL = 'sc-list-item-cancel-action';

/**
  @static
  @constant
*/
SC.LIST_ITEM_ACTION_REFRESH = 'sc-list-item-cancel-refresh';

/**
  @static
  @constant
*/
SC.LIST_ITEM_ACTION_EJECT = 'sc-list-item-cancel-eject';

/**
  @class

  Many times list items need to display a lot more than just a label of text.
  You often need to include checkboxes, icons, right icons, extra counts and
  an action or warning icon to the far right.

  A ListItemView can implement all of this for you in a more efficient way
  than you might get if you simply put together a list item on your own using
  views.

  @extends SC.View
  @extends SC.Control
  @extends SC.InlineEditable
  @since SproutCore 1.0
*/
SC.ListItemView = SC.View.extend(SC.InlineEditable, SC.Control,
/** @scope SC.ListItemView.prototype */ {

  /**
    @type Array
    @default ['sc-list-item-view']
    @see SC.View#classNames
  */
  classNames: ['sc-list-item-view'],

  /**
    @type Array
    @default ['disclosureState', 'escapeHTML']
    @see SC.View#displayProperties
  */
  displayProperties: ['disclosureState', 'escapeHTML', 'isDropTarget'],


  // ..........................................................
  // KEY PROPERTIES
  //

  /**
    The index of the content object in the ListView to which this
    ListItemView belongs.

    For example, if this ListItemView represents the first object
    in a ListView, this property would be 0.

    @type Number
    @default null
    @readOnly
  */
  contentIndex: null,

  /**
    (displayDelegate) True if you want the item view to display an icon.

    If false, the icon on the list item view will be hidden.  Otherwise,
    space will be left for the icon next to the list item view.

    @type Boolean
    @default NO
  */
  hasContentIcon: NO,

  /**
    (displayDelegate) True if you want the item view to display a right icon.

    If false, the icon on the list item view will be hidden.  Otherwise,
    space will be left for the icon next to the list item view.

    @type Boolean
    @default NO
  */
  hasContentRightIcon: NO,

  /**
    (displayDelegate) True if you want space to be allocated for a branch
    arrow.

    If false, the space for the branch arrow will be collapsed.

    @type Boolean
    @default NO
  */
  hasContentBranch: NO,

  /**
    (displayDelegate) The name of the property used for the checkbox value.

    The checkbox will only be visible if this key is not null.

    @type String
    @default null
  */
  contentCheckboxKey: null,

  /**
    The URL or CSS class name to use for the icon. This is only used if
    contentIconKey is null, or returns null from the delegate.

    @type String
    @default null
  */
  icon: null,

  /**
    Whether this item is the drop target of a drag operation.

    If the list view supports the SC.DROP_ON operation, it will set this
    property on whichever list item view is the current target of the drop.

    When true, the 'drop-target' class is added to the element.

    @type Boolean
    @default false
  */
  isDropTarget: NO,

  /**
    (displayDelegate) Property key to use for the icon url

    This property will be checked on the content object to determine the
    icon to display.  It must return either a URL or a CSS class name.

    @type String
    @default NO
  */
  contentIconKey: null,

  /**
    The URL or CSS class name to use for the right icon. This is only used if
    contentRightIconKey is null, or returns null from the delegate.

    @type String
    @default null
  */
  rightIcon: null,

  /**
    (displayDelegate) Property key to use for the right icon url

    This property will be checked on the content object to determine the
    icon to display.  It must return either a URL or a CSS class name.

    @type String
    @default null
  */
  contentRightIconKey: null,

  /**
    (displayDelegate) The name of the property used for label itself

    If null, then the content object itself will be used..

    @type String
    @default null
  */
  contentValueKey: null,

  /**
    IF true, the label value will be escaped to avoid HTML injection attacks.
    You should only disable this option if you are sure you will only
    display content that is already escaped and you need the added
    performance gain.

    @type Boolean
    @default YES
  */
  escapeHTML: YES,

  /**
    (displayDelegate) The name of the property used to find the count of
    unread items.

    The count will only be visible if this property is not null and the
    returned value is not 0.

    @type String
    @default null
  */
  contentUnreadCountKey: null,

  /**
    (displayDelegate) The name of the property used to determine if the item
    is a branch or leaf (i.e. if the branch icon should be displayed to the
    right edge.)

    If this is null, then the branch view will be completely hidden.
    Otherwise space will be allocated for it.

    @type String
    @default null
  */
  contentIsBranchKey: null,

  /**
    Indent to use when rendering a list item with an outline level > 0.  The
    left edge of the list item will be indented by this amount for each
    outline level.

    @type Number
    @default 16
  */
  outlineIndent: 16,

  /**
    Outline level for this list item.  Usually set by the collection view.

    @type Number
    @default 0
  */
  outlineLevel: 0,

  /**
    Disclosure state for this list item.  Usually set by the collection view
    when the list item is created. Possible values:

      - SC.LEAF_NODE
      - SC.BRANCH_OPEN
      - SC.BRANCH_CLOSED

    @type String
    @default SC.LEAF_NODE
  */
  disclosureState: SC.LEAF_NODE,

  /**
    The validator to use for the inline text field created when the list item
    is edited.
  */
  validator: null,

  contentKeys: {
    contentValueKey: 'title',
    contentCheckboxKey: 'checkbox',
    contentIconKey:  'icon',
    contentRightIconKey: 'rightIcon',
    contentUnreadCountKey: 'count',
    contentIsBranchKey: 'branch'
  },

  /** @private */
  contentPropertyDidChange: function () {
    //if (this.get('isEditing')) this.discardEditing();
    if (this.get('contentIsEditable') !== this.contentIsEditable()) {
      this.notifyPropertyChange('contentIsEditable');
    }

    this.displayDidChange();
  },

  /**
    Determines if content is editable or not. Checkboxes and other related
    components will render disabled if an item is not editable.

    @field
    @type Boolean
    @observes content
  */
  contentIsEditable: function () {
    var content = this.get('content');
    return content && (content.get ? content.get('isEditable') !== NO : NO);
  }.property('content').cacheable(),

  /**
    @type Object
    @default SC.InlineTextFieldDelegate
  */
  inlineEditorDelegate: SC.InlineTextFieldDelegate,

  /**
    Finds and retrieves the element containing the label.  This is used
    for inline editing.  The default implementation returns a CoreQuery
    selecting any label elements.   If you override renderLabel() you
    probably need to override this as well.

    @returns {jQuery} jQuery object selecting label elements
  */
  $label: function () {
    return this.$('label');
  },

  /** @private
    Determines if the event occurred inside an element with the specified
    classname or not.
  */
  _isInsideElementWithClassName: function (className, evt) {
    var layer = this.get('layer');
    if (!layer) return NO; // no layer yet -- nothing to do

    var el = SC.$(evt.target);
    var ret = NO;
    while (!ret && el.length > 0 && (el[0] !== layer)) {
      if (el.hasClass(className)) ret = YES;
      el = el.parent();
    }
    el = layer = null; //avoid memory leaks
    return ret;
  },

  /** @private
    Returns YES if the list item has a checkbox and the event occurred
    inside of it.
  */
  _isInsideCheckbox: function (evt) {
    var del = this.displayDelegate;
    var checkboxKey = this.getDelegateProperty('contentCheckboxKey', del);
    return checkboxKey && this._isInsideElementWithClassName('sc-checkbox-view', evt);
  },

  /** @private
    Returns YES if the list item has a disclosure triangle and the event
    occurred inside of it.
  */
  _isInsideDisclosure: function (evt) {
    if (this.get('disclosureState') === SC.LEAF_NODE) return NO;
    return this._isInsideElementWithClassName('sc-disclosure-view', evt);
  },

  /** @private
    Returns YES if the list item has a right icon and the event
    occurred inside of it.
  */
  _isInsideRightIcon: function (evt) {
    var del = this.displayDelegate;
    var rightIconKey = this.getDelegateProperty('hasContentRightIcon', del) || !SC.none(this.rightIcon);
    return rightIconKey && this._isInsideElementWithClassName('right-icon', evt);
  },

  /** @private
    mouseDown is handled only for clicks on the checkbox view or or action
    button.
  */
  mouseDown: function (evt) {
    // if content is not editable, then always let collection view handle the
    // event.
    if (!this.get('contentIsEditable')) return NO;

    // if occurred inside checkbox, item view should handle the event.
    if (this._isInsideCheckbox(evt)) {
      this._addCheckboxActiveState();
      this._isMouseDownOnCheckbox = YES;
      this._isMouseInsideCheckbox = YES;
      return YES; // listItem should handle this event

    } else if (this._isInsideDisclosure(evt)) {
      this._addDisclosureActiveState();
      this._isMouseDownOnDisclosure = YES;
      this._isMouseInsideDisclosure = YES;
      return YES;
    } else if (this._isInsideRightIcon(evt)) {
      this._addRightIconActiveState();
      this._isMouseDownOnRightIcon = YES;
      this._isMouseInsideRightIcon = YES;
      return YES;
    }

    return NO; // let the collection view handle this event
  },

  /** @private */
  mouseUp: function (evt) {
    var ret = NO, del, checkboxKey, content, state, idx, set;

    // if mouse was down in checkbox -- then handle mouse up, otherwise
    // allow parent view to handle event.
    if (this._isMouseDownOnCheckbox) {

      // update only if mouse inside on mouse up...
      if (this._isInsideCheckbox(evt)) {
        del = this.displayDelegate;
        checkboxKey = this.getDelegateProperty('contentCheckboxKey', del);
        content = this.get('content');
        if (content && content.get) {
          var value = content.get(checkboxKey);
          value = (value === SC.MIXED_STATE) ? YES : !value;
          content.set(checkboxKey, value); // update content
          this.displayDidChange(); // repaint view...
        }
      }

      this._removeCheckboxActiveState();
      ret = YES;

    // if mouse as down on disclosure -- handle mouse up.  otherwise pass on
    // to parent.
    } else if (this._isMouseDownOnDisclosure) {
      if (this._isInsideDisclosure(evt)) {
        state = this.get('disclosureState');
        idx   = this.get('contentIndex');
        set   = (!SC.none(idx)) ? SC.IndexSet.create(idx) : null;
        del = this.get('displayDelegate');

        if (state === SC.BRANCH_OPEN) {
          if (set && del && del.collapse) del.collapse(set);
          else this.set('disclosureState', SC.BRANCH_CLOSED);
          this.displayDidChange();

        } else if (state === SC.BRANCH_CLOSED) {
          if (set && del && del.expand) del.expand(set);
          else this.set('disclosureState', SC.BRANCH_OPEN);
          this.displayDidChange();
        }
      }

      this._removeDisclosureActiveState();
      ret = YES;
    // if mouse was down in right icon -- then handle mouse up, otherwise
    // allow parent view to handle event.
    } else if (this._isMouseDownOnRightIcon) {
      this._removeRightIconActiveState();
      ret = YES;
    }

    // clear cached info
    this._isMouseInsideCheckbox = this._isMouseDownOnCheckbox = NO;
    this._isMouseDownOnDisclosure = this._isMouseInsideDisclosure = NO;
    this._isMouseInsideRightIcon = this._isMouseDownOnRightIcon = NO;
    return ret;
  },

  /** @private */
  mouseMoved: function (evt) {
    if (this._isMouseDownOnCheckbox && this._isInsideCheckbox(evt)) {
      this._addCheckboxActiveState();
      this._isMouseInsideCheckbox = YES;
    } else if (this._isMouseDownOnCheckbox) {
      this._removeCheckboxActiveState();
      this._isMouseInsideCheckbox = NO;
    } else if (this._isMouseDownOnDisclosure && this._isInsideDisclosure(evt)) {
      this._addDisclosureActiveState();
      this._isMouseInsideDisclosure = YES;
    } else if (this._isMouseDownOnDisclosure) {
      this._removeDisclosureActiveState();
      this._isMouseInsideDisclosure = NO;
    } else if (this._isMouseDownOnRightIcon && this._isInsideRightIcon(evt)) {
      this._addRightIconActiveState();
      this._isMouseInsideRightIcon = YES;
    } else if (this._isMouseDownOnRightIcon) {
      this._removeRightIconActiveState();
      this._isMouseInsideRightIcon = NO;
    }

    return NO;
  },

  /** @private */
  touchStart: function (evt) {
    return this.mouseDown(evt);
  },

  /** @private */
  touchEnd: function (evt) {
    return this.mouseUp(evt);
  },

  /** @private */
  touchEntered: function (evt) {
    return this.mouseEntered(evt);
  },

  /** @private */
  touchExited: function (evt) {
    return this.mouseExited(evt);
  },


  /** @private */
  _addCheckboxActiveState: function () {
    if (this.get('isEnabled')) {
      if (this._checkboxRenderDelegate) {
        var source = this._checkboxRenderSource;

        source.set('isActive', YES);

        this._checkboxRenderDelegate.update(source, this.$('.sc-checkbox-view'));
      } else {
        // for backwards-compatibility.
        this.$('.sc-checkbox-view').addClass('active');
      }
    }
  },

  /** @private */
  _removeCheckboxActiveState: function () {
    if (this._checkboxRenderer) {
      var source = this._checkboxRenderSource;

      source.set('isActive', NO);

      this._checkboxRenderDelegate.update(source, this.$('.sc-checkbox-view'));
    } else {
      // for backwards-compatibility.
      this.$('.sc-checkbox-view').removeClass('active');
    }
  },

  /** @private */
  _addDisclosureActiveState: function () {
    if (this.get('isEnabled')) {
      if (this._disclosureRenderDelegate) {
        var source = this._disclosureRenderSource;
        source.set('isActive', YES);

        this._disclosureRenderDelegate.update(source, this.$('.sc-disclosure-view'));
      } else {
        // for backwards-compatibility.
        this.$('.sc-disclosure-view').addClass('active');
      }

    }
  },

  /** @private */
  _removeDisclosureActiveState: function () {
    if (this._disclosureRenderer) {
      var source = this._disclosureRenderSource;
      source.set('isActive', NO);

      this._disclosureRenderDelegate.update(source, this.$('.sc-disclosure-view'));
    } else {
      // for backwards-compatibility.
      this.$('.sc-disclosure-view').addClass('active');
    }
  },

  /** @private */
  _addRightIconActiveState: function () {
    this.$('img.right-icon').setClass('active', YES);
  },

  /** @private */
  _removeRightIconActiveState: function () {
    this.$('img.right-icon').removeClass('active');
  },

  /** @private
    Returns true if a click is on the label text itself to enable editing.

    Note that if you override renderLabel(), you probably need to override
    this as well, or just $label() if you only want to control the element
    returned.

    @param evt {Event} the mouseUp event.
    @returns {Boolean} YES if the mouse was on the content element itself.
  */
  contentHitTest: function (evt) {
    // if not content value is returned, not much to do.
    var del = this.displayDelegate;
    var labelKey = this.getDelegateProperty('contentValueKey', del);
    if (!labelKey) return NO;

    // get the element to check for.
    var el = this.$label()[0];
    if (!el) return NO; // no label to check for.

    var cur = evt.target, layer = this.get('layer');
    while (cur && (cur !== layer) && (cur !== window)) {
      if (cur === el) return YES;
      cur = cur.parentNode;
    }

    return NO;
  },

  /*
    Edits the label portion of the list item. If scrollIfNeeded is YES, will
    scroll to the item before editing it.

    @params {Boolean} if the parent scroll view should be scrolled to this item
      before editing begins
    @returns {Boolean} YES if successful
  */
  beginEditing: function (original, scrollIfNeeded) {
    var el        = this.$label(),
        parent    = this.get('parentView');

    // if possible, find a nearby scroll view and scroll into view.
    // HACK: if we scrolled, then wait for a loop and get the item view again
    // and begin editing.  Right now collection view will regenerate the item
    // view too often.
    if (scrollIfNeeded && this.scrollToVisible()) {
      var collectionView = this.get('owner'),
        idx = this.get('contentIndex');

      this.invokeLast(function () {
        var item = collectionView.itemViewForContentIndex(idx);
        if (item && item.beginEditing) item.beginEditing(NO);
      });
      return YES; // let the scroll happen then begin editing...
    }

    else if (!parent || !el || el.get('length') === 0) return NO;

    else return original();
  }.enhance(),

  /*
    Configures the editor to overlay the label properly.
  */
  inlineEditorWillBeginEditing: function (editor, editable, value) {
    var content   = this.get('content'),
        del       = this.get('displayDelegate'),
        labelKey  = this.getDelegateProperty('contentValueKey', del),
        el        = this.$label(),
        validator = this.get('validator'),
        f, v, offset, fontSize, top, lineHeight, escapeHTML,
        lineHeightShift, targetLineHeight;

    v = (labelKey && content) ? (content.get ? content.get(labelKey) : content[labelKey]) : content;

    f = this.computeFrameWithParentFrame(null);

    // if the label has a large line height, try to adjust it to something
    // more reasonable so that it looks right when we show the popup editor.
    lineHeight = this._oldLineHeight = el.css('lineHeight');
    fontSize = el.css('fontSize');
    top = this.$().css('top');

    if (top) top = parseInt(top.substring(0, top.length - 2), 0);
    else top = 0;

    lineHeightShift = 0;

    if (fontSize && lineHeight) {
      targetLineHeight = fontSize * 1.5;
      if (targetLineHeight < lineHeight) {
        el.css({ lineHeight: '1.5' });
        lineHeightShift = (lineHeight - targetLineHeight) / 2;
      } else this._oldLineHeight = null;
    }

    el = el[0];
    offset = SC.offset(el);

    f.x = offset.x;
    f.y = offset.y + top + lineHeightShift;
    f.height = el.offsetHeight;
    f.width = el.offsetWidth;

    escapeHTML = this.get('escapeHTML');

    editor.set({
      value: v,
      exampleFrame: f,
      exampleElement: el,
      multiline: NO,
      validator: validator,
      escapeHTML: escapeHTML
    });
  },

  /** @private
    Allow editing.
  */
  inlineEditorShouldBeginEditing: function (inlineEditor) {
    return YES;
  },

  /** @private
   Hide the label view while the inline editor covers it.
  */
  inlineEditorDidBeginEditing: function (original, inlineEditor, value, editable) {
    original(inlineEditor, value, editable);

    var el = this.$label();
    this._oldOpacity = el.css('opacity');
    el.css('opacity', 0.0);

    // restore old line height for original item if the old line height
    // was saved.
    if (this._oldLineHeight) el.css({ lineHeight: this._oldLineHeight });
  }.enhance(),

  /** @private
   Update the field value and make it visible again.
  */
  inlineEditorDidCommitEditing: function (editor, finalValue, editable) {
    var content = this.get('content');
    var del = this.displayDelegate;
    var labelKey = this.getDelegateProperty('contentValueKey', del);

    if (labelKey && content) {
      if (content.set) content.set(labelKey, finalValue);
      else content[labelKey] = finalValue;
    }

    else this.set('content', finalValue);

    this.displayDidChange();

    this._endEditing();
  },

  _endEditing: function (original) {
    this.$label().css('opacity', this._oldOpacity);

    original();
  }.enhance(),

  /** SC.ListItemView is not able to update itself in place at this time. */
  // TODO: add update: support.
  isReusable: false,

  /** @private
    Fills the passed html-array with strings that can be joined to form the
    innerHTML of the receiver element.  Also populates an array of classNames
    to set on the outer element.

    @param {SC.RenderContext} context
    @param {Boolean} firstTime
    @returns {void}
  */
  render: function (context, firstTime) {
    var content = this.get('content'),
        del     = this.displayDelegate,
        level   = this.get('outlineLevel'),
        indent  = this.get('outlineIndent'),
        key, value, working, classArray = [];

    // add alternating row classes
    classArray.push((this.get('contentIndex') % 2 === 0) ? 'even' : 'odd');
    context.setClass('disabled', !this.get('isEnabled'));
    context.setClass('drop-target', this.get('isDropTarget'));

    // outline level wrapper
    working = context.begin("div").addClass("sc-outline");
    if (level >= 0 && indent > 0) working.addStyle("left", indent * (level + 1));

    // handle disclosure triangle
    value = this.get('disclosureState');
    if (value !== SC.LEAF_NODE) {
      this.renderDisclosure(working, value);
      classArray.push('has-disclosure');
    } else if (this._disclosureRenderSource) {
      // If previously rendered a disclosure, clean up.
      context.removeClass('has-disclosure');
      this._disclosureRenderSource.destroy();

      this._disclosureRenderSource = this._disclosureRenderDelegate = null;
    }

    // handle checkbox
    key = this.getDelegateProperty('contentCheckboxKey', del);
    if (key) {
      value = content ? (content.get ? content.get(key) : content[key]) : NO;
      if (value !== null) {
        this.renderCheckbox(working, value);
        classArray.push('has-checkbox');
      } else if (this._checkboxRenderSource) {
        // If previously rendered a checkbox, clean up.
        context.removeClass('has-checkbox');
        this._checkboxRenderSource.destroy();

        this._checkboxRenderSource = this._checkboxRenderDelegate = null;
      }
    }

    // handle icon
    if (this.getDelegateProperty('hasContentIcon', del)) {
      key = this.getDelegateProperty('contentIconKey', del);
      value = (key && content) ? (content.get ? content.get(key) : content[key]) : null;

      if (value) {
        this.renderIcon(working, value);
        classArray.push('has-icon');
      }
    } else if (this.get('icon')) {
      value = this.get('icon');
      this.renderIcon(working, value);
      classArray.push('has-icon');
    }

    // handle label -- always invoke
    key = this.getDelegateProperty('contentValueKey', del);
    value = (key && content) ? (content.get ? content.get(key) : content[key]) : content;
    if (value && SC.typeOf(value) !== SC.T_STRING) value = value.toString();
    if (this.get('escapeHTML')) value = SC.RenderContext.escapeHTML(value);
    this.renderLabel(working, value);

    // handle right icon
    if (this.getDelegateProperty('hasContentRightIcon', del)) {
      key = this.getDelegateProperty('contentRightIconKey', del);
      value = (key && content) ? (content.get ? content.get(key) : content[key]) : null;

      if (value) {
        this.renderRightIcon(working, value);
        classArray.push('has-right-icon');
      }
    } else if (this.get('rightIcon')) {
      value = this.get('rightIcon');
      this.renderRightIcon(working, value);
      classArray.push('has-right-icon');
    }

    // handle unread count
    key = this.getDelegateProperty('contentUnreadCountKey', del);
    value = (key && content) ? (content.get ? content.get(key) : content[key]) : null;
    if (!SC.none(value) && (value !== 0)) {
      this.renderCount(working, value);
      var digits = ['zero', 'one', 'two', 'three', 'four', 'five'];
      var valueLength = value.toString().length;
      var digitsLength = digits.length;
      var digit = (valueLength < digitsLength) ? digits[valueLength] : digits[digitsLength - 1];
      classArray.push('has-count', digit + '-digit');
    } else {
      // If previously rendered a count, clean up.
      context.removeClass('has-count');
    }

    // handle action
    key = this.getDelegateProperty('listItemActionProperty', del);
    value = (key && content) ? (content.get ? content.get(key) : content[key]) : null;
    if (value) {
      this.renderAction(working, value);
      classArray.push('has-action');
    }

    // handle branch
    if (this.getDelegateProperty('hasContentBranch', del)) {
      key = this.getDelegateProperty('contentIsBranchKey', del);
      value = (key && content) ? (content.get ? content.get(key) : content[key]) : NO;
      this.renderBranch(working, value);
      classArray.push('has-branch');
    }
    context.addClass(classArray);
    context = working.end();
  },

  /** @private
    Adds a disclosure triangle with the appropriate display to the content.
    This method will only be called if the disclosure state of the view is
    something other than SC.LEAF_NODE.

    @param {SC.RenderContext} context the render context
    @param {Boolean} state YES, NO or SC.MIXED_STATE
    @returns {void}
  */
  renderDisclosure: function (context, state) {
    var renderer = this.get('theme').disclosureRenderDelegate;

    context = context.begin('div')
      .addClass('sc-disclosure-view')
      .addClass('sc-regular-size')
      .addClass(this.get('theme').classNames)
      .addClass(renderer.get('className'));

    var source = this._disclosureRenderSource;
    if (!source) {
      this._disclosureRenderSource = source =
      SC.Object.create({ renderState: {}, theme: this.get('theme') });
    }

    source
      .set('isSelected', state === SC.BRANCH_OPEN)
      .set('isEnabled', this.get('isEnabled'))
      .set('title', '');

    renderer.render(source, context);

    context = context.end();
    this._disclosureRenderDelegate = renderer;
  },

  /** @private
    Adds a checkbox with the appropriate state to the content.  This method
    will only be called if the list item view is supposed to have a
    checkbox.

    @param {SC.RenderContext} context the render context
    @param {Boolean} state YES, NO or SC.MIXED_STATE
    @returns {void}
  */
  renderCheckbox: function (context, state) {
    var renderer = this.get('theme').checkboxRenderDelegate;

    // note: checkbox-view is really not the best thing to do here; we should do
    // sc-list-item-checkbox; however, themes expect something different, unfortunately.
    context = context.begin('div')
      .addClass('sc-checkbox-view')
      .addClass('sc-regular-size')
      .addClass(this.get('theme').classNames)
      .addClass(renderer.get('className'));

    var source = this._checkboxRenderSource;
    if (!source) {
      source = this._checkboxRenderSource =
      SC.Object.create({ renderState: {}, theme: this.get('theme') });
    }

    source
      .set('isSelected', state && (state !== SC.MIXED_STATE))
      .set('isEnabled', this.get('isEnabled') && this.get('contentIsEditable'))
      .set('isActive', this._checkboxIsActive)
      .set('title', '');

    renderer.render(source, context);
    context = context.end();

    this._checkboxRenderDelegate = renderer;
  },

  /** @private
    Generates an icon for the label based on the content.  This method will
    only be called if the list item view has icons enabled.  You can override
    this method to display your own type of icon if desired.

    @param {SC.RenderContext} context the render context
    @param {String} icon a URL or class name.
    @returns {void}
  */
  renderIcon: function (context, icon) {
    // get a class name and url to include if relevant
    var url = null, className = null, classArray = [];
    if (icon && SC.ImageView.valueIsUrl(icon)) {
      url = icon;
      className = '';
    } else {
      className = icon;
      url = SC.BLANK_IMAGE_URL;
    }

    // generate the img element...
    classArray.push(className, 'icon');
    context.begin('img')
            .addClass(classArray)
            .setAttr('src', url)
            .end();
  },

  /** @private
   Generates a label based on the content.  You can override this method to
   display your own type of icon if desired.

   @param {SC.RenderContext} context the render context
   @param {String} label the label to display, already HTML escaped.
   @returns {void}
  */
  renderLabel: function (context, label) {
    context.push('<label>', label || '', '</label>');
  },

  /** @private
    Generates a right icon for the label based on the content.  This method will
    only be called if the list item view has icons enabled.  You can override
    this method to display your own type of icon if desired.

    @param {SC.RenderContext} context the render context
    @param {String} icon a URL or class name.
    @returns {void}
  */
  renderRightIcon: function (context, icon) {
    // get a class name and url to include if relevant
    var url = null,
      className = null,
      classArray = [];
    if (icon && SC.ImageView.valueIsUrl(icon)) {
      url = icon;
      className = '';
    } else {
      className = icon;
      url = SC.BLANK_IMAGE_URL;
    }

    // generate the img element...
    classArray.push('right-icon', className);
    context.begin('img')
      .addClass(classArray)
      .setAttr('src', url)
    .end();
  },

  /** @private
   Generates an unread or other count for the list item.  This method will
   only be called if the list item view has counts enabled.  You can
   override this method to display your own type of counts if desired.

   @param {SC.RenderContext} context the render context
   @param {Number} count the count
   @returns {void}
  */
  renderCount: function (context, count) {
    context.push('<span class="count"><span class="inner">',
                  count.toString(), '</span></span>');
  },

  /** @private
    Generates the html string used to represent the action item for your
    list item.  override this to return your own custom HTML

    @param {SC.RenderContext} context the render context
    @param {String} actionClassName the name of the action item
    @returns {void}
  */
  renderAction: function (context, actionClassName) {
    context.push('<img src="', SC.BLANK_IMAGE_URL, '" class="action" />');
  },

  /** @private
   Generates the string used to represent the branch arrow. override this to
   return your own custom HTML

   @param {SC.RenderContext} context the render context
   @param {Boolean} hasBranch YES if the item has a branch
   @returns {void}
  */
  renderBranch: function (context, hasBranch) {
    var classArray = [];
    classArray.push('branch', hasBranch ? 'branch-visible' : 'branch-hidden');
    context.begin('span')
          .addClass(classArray)
          .push('&nbsp;')
          .end();
  }

});

SC.ListItemView._deprecatedRenderWarningHasBeenIssued = false;

/* >>>>>>>>>> BEGIN source/views/collection.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('mixins/collection_view_delegate');
sc_require('views/list_item');

/**
  Special drag operation passed to delegate if the collection view proposes
  to perform a reorder event.

  @static
  @constant
*/
SC.DRAG_REORDER = 0x0010;

/**
  @class

  This class renders a collection of views based on the items array set
  as its content.  You will not use this class directly as it does not
  order the views in any manner.  Instead you will want to subclass
  SC.CollectionView or use one of its existing subclasses in SproutCore
  such as SC.ListView, which renders items in a vertical list or SC.GridView,
  which renders items in a grid.

  To use a CollectionView subclass, just create the view and set the 'content'
  property to an array of objects.  The collection view will create instances of
  the given exampleView class for each item in the array.  You can also bind to
  the selection property if you want to monitor the current selection.

  # Extreme Performance

  SC.CollectionView does not just naively render one view per item and
  instead is aggressively optimized to allow for collections of
  hundreds of thousands of items to perform as fast as only a few items.  In
  order to achieve this, first it only creates views and elements for the items
  currently visible.  Therefore, when overriding SC.CollectionView, it is
  critically important to implement `contentIndexesInRect` which should return
  only the indexes of those items that should appear within the visible rect.
  By returning only the indexes that are visible, SC.CollectionView can represent
  enormous collections with only a few views and elements.

  The second optimization, is that SC.CollectionView will pool and reuse the
  few views and elements that it does need to create.  Creating and destroying
  views incrementally hurts performance, so by reusing the same views over and
  over, the view can much more quickly alter the set of visible views.  As well,
  inserting and removing elements from the DOM takes more time than simply
  modifying the contents of the same elements over and over, which allows us to
  leave the DOM tree untouched.

  @extends SC.View
  @extends SC.CollectionViewDelegate
  @extends SC.CollectionContent
  @since SproutCore 0.9
*/
SC.CollectionView = SC.View.extend(SC.CollectionViewDelegate, SC.CollectionContent,
/** @scope SC.CollectionView.prototype */ {

  /**
    @type Array
    @default ['sc-collection-view']
    @see SC.View#classNames
  */
  classNames: ['sc-collection-view'],

  /**
    @type Array
    @default ['isActive']
  */
  displayProperties: ['isActive'],

  /**
    @type String
    @default 'collectionRenderDelegate'
  */
  renderDelegateName: 'collectionRenderDelegate',

  /**
    @type Number
    @default 200
  */
  ACTION_DELAY: 200,

  // ......................................
  // PROPERTIES
  //

  /**
    If `YES`, uses the experimental fast `CollectionView` path.

    *Note* The performance improvements in the experimental code have been
    integrated directly into SC.CollectionView.  If you have set this property
    to true, you should set it to false and refer to the class documentation
    explaining how to modify the performance boost behavior if necessary.

    Generally, no modifications should be necessary and you should see an
    immediate performance improvement in all collections, especially on
    mobile devices.

    @type Boolean
    @deprecated Version 1.10
    @default NO
  */
  useFastPath: NO,

  /**
    An array of content objects

    This array should contain the content objects you want the collection view
    to display.  An item view (based on the `exampleView` view class) will be
    created for each content object, in the order the content objects appear
    in this array.

    If you make the collection editable, the collection view will also modify
    this array using the observable array methods of `SC.Array`.

    Usually you will want to bind this property to a controller property
    that actually contains the array of objects you to display.

    @type SC.Array
    @default null
  */
  content: null,

  /** @private */
  contentBindingDefault: SC.Binding.multiple(),

  /**
    The current length of the content.

    @readonly
    @type Number
    @default 0
  */
  length: 0,

  /**
    The set of indexes that are currently tracked by the collection view.
    This property is used to determine the range of items the collection view
    should monitor for changes.

    The default implementation of this property returns an index set covering
    the entire range of the content.  It changes automatically whenever the
    length changes.

    Note that the returned index set for this property will always be frozen.
    To change the nowShowing index set, you must create a new index set and
    apply it.

    @field
    @type SC.IndexSet
    @observes length
    @observes clippingFrame
  */
  nowShowing: function () {
    // If there is an in-scroll clipping frame, use it.
    var clippingFrame = this._inScrollClippingFrame || this.get('clippingFrame');

    return this.computeNowShowing(clippingFrame);
  }.property('length', 'clippingFrame').cacheable(),

  /**
    Indexes of selected content objects.  This `SC.SelectionSet` is modified
    automatically by the collection view when the user changes the selection
    on the collection.

    Any item views representing content objects in this set will have their
    isSelected property set to `YES` automatically.

    @type SC.SelectionSet
    @default null
  */
  selection: null,

  /**
    Allow user to select content using the mouse and keyboard.

    Set this property to `NO` to disallow the user from selecting items. If you
    have items in your `selectedIndexes` property, they will still be reflected
    visually.

    @type Boolean
    @default YES
  */
  isSelectable: YES,

  /** @private */
  isSelectableBindingDefault: SC.Binding.bool(),

  /**
    Enable or disable the view.

    The collection view will set the `isEnabled` property of its item views to
    reflect the same view of this property.  Whenever `isEnabled` is false,
    the collection view will also be not selectable or editable, regardless of
    the settings for `isEditable` & `isSelectable`.

    @type Boolean
    @default YES
  */
  isEnabled: YES,

  /** @private */
  isEnabledBindingDefault: SC.Binding.bool(),

  /**
    Allow user to edit content views.

    Whenever `isEditable` is false, the user will not be able to reorder, add,
    or delete items regardless of the `canReorderContent` and `canDeleteContent`
    and `isDropTarget` properties.

    @type Boolean
    @default YES
  */
  isEditable: YES,

  /** @private */
  isEditableBindingDefault: SC.Binding.bool(),

  /**
    Allow user to reorder items using drag and drop.

    If true, the user can use drag and drop to reorder items in the list.
    If you also accept drops, this will allow the user to drop items into
    specific points in the list.  Otherwise items will be added to the end.

    When canReorderContent is true, item views will have the `isReorderable`
    property set to true (if the `isEditable` is true on the collection).

    @type Boolean
    @default NO
  */
  canReorderContent: NO,

  /** @private */
  canReorderContentBindingDefault: SC.Binding.bool(),

  /**
    Allow the user to delete items using the delete key

    If true the user will be allowed to delete selected items using the delete
    key.  Otherwise deletes will not be permitted.

    When canDeleteContent is true, item views will have the `isDeletable`
    property set to true (if the `isEditable` is true on the collection).

    @type Boolean
    @default NO
  */
  canDeleteContent: NO,

  /** @private */
  canDeleteContentBindingDefault: SC.Binding.bool(),

  /**
    Allow user to edit the content by double clicking on it or hitting return.
    This will only work if isEditable is `YES` and the item view implements
    the `beginEditing()` method.

    When canEditContent is true, item views will have the `isEditable`
    property set to true (if the `isEditable` is true on the collection).

    @type Boolean
  */
  canEditContent: NO,

  /** @private */
  canEditContentBindingDefault: SC.Binding.bool(),

  /**
    Accept drops for data other than reordering.

    Setting this property to return true when the view is instantiated will
    cause it to be registered as a drop target, activating the other drop
    machinery.

    @type Boolean
    @default NO
  */
  isDropTarget: NO,

  /**
    Use toggle selection instead of normal click behavior.

    If set to true, then selection will use a toggle instead of the normal
    click behavior.  Command modifiers will be ignored and instead clicking
    once will select an item and clicking on it again will deselect it.

    @type Boolean
    @default NO
  */
  useToggleSelection: NO,

  /**
    Trigger the action method on a single click.

    Normally, clicking on an item view in a collection will select the content
    object and double clicking will trigger the action method on the
    collection view.

    If you set this property to `YES`, then clicking on a view will both select
    it (if `isSelected` is true) and trigger the action method.

    Use this if you are using the collection view as a menu of items.

    @type Boolean
    @default NO
  */
  actOnSelect: NO,


  /**
    Select an item immediately on mouse down

    Normally as soon as you begin a click the item will be selected.

    In some UI scenarios, you might want to prevent selection until
    the mouse is released, so you can perform, for instance, a drag operation
    without actually selecting the target item.

    @type Boolean
    @default YES
  */
  selectOnMouseDown: YES,

  /**
    The view class to use when creating new item views.

    The collection view will automatically create an instance of the view
    class you set here for each item in its content array.  You should provide
    your own subclass for this property to display the type of content you
    want.

    The view you set here should understand the following properties, which
    it can use to alter its display:

    - `content` -- The content object from the content array your view should
      display.
    - `isEnabled` -- False if the view should appear disabled.
    - `isSelected` -- True if the view should appear selected.
    - `contentIndex` -- The current index of the view's content.
    - `isEditable` -- True if the view should appear editable by clicking on it
      or hitting the Return key.
    - `isReorderable` -- True if the view should appear reorderable by dragging
      it.
    - `isDeletable` -- True if the view should appear deletable, by clicking on
      a delete button within it or hitting the Delete key.

    # Working with View and Element Pooling

    As noted in the SC.CollectionView description above, by default the few
    instances that are needed of the exampleView class will be created and then
    reused.  Reusing an exampleView means that the content, isSelected, isEnabled,
    isEditable, isReorderable, isDeletable and contentIndex properties will be
    updated as an existing view is pulled from the pool to be displayed.

    If your custom exampleView class has trouble being reused, you may want to
    implement the `sleepInPool` and `awakeFromPool` methods in your exampleView.
    These two methods will be called on the view, one before it is pooled,
    sleepInPool, and the other before it is unpooled, awakeFromPool.  For
    example, if your item views have images and there is a delay for new
    images to appear, you may want to use sleepInPool to ensure the previous
    image is unloaded so it doesn't appear momentarily while the new image loads.

    Also, if the rendered output of your exampleView does not update properly you
    can disable reuse of the layer by setting `isLayerReusable` to false.  This
    will reduce the performance of your collection though and it is recommended
    that you instead look at ways to properly update the existing layer as the
    content changes.

    Finally, if you really don't want view or element reuse at all, you may
    disable them both by setting `isReusable` to false in your exampleView class.
    Your collection will still benefit greatly from incremental rendering, but
    it will perform slightly less well than with optimal re-use.

    # Event handling

    In general you do not want your child views to actually respond to mouse
    and keyboard events themselves.  It is better to let the collection view
    do that.

    If you do implement your own event handlers such as mouseDown or mouseUp,
    you should be sure to actually call the same method on the collection view
    to give it the chance to perform its own selection housekeeping.

    @type SC.View
    @default SC.View
  */
  exampleView: SC.View,

  /**
    If set, this key will be used to get the example view for a given
    content object.  The exampleView property will be ignored.

    @type String
    @default null
  */
  contentExampleViewKey: null,

  /**
    The view class to use when creating new group item views.

    The collection view will automatically create an instance of the view
    class you set here for each item in its content array.  You should provide
    your own subclass for this property to display the type of content you
    want.

    If you leave this set to null then the regular example view will be used
    with the isGroupView property set to YES on the item view.

    @type SC.View
    @default null
  */
  groupExampleView: null,

  /**
    If set, this key will be used to get the example view for a given
    content object.  The `groupExampleView` property will be ignored.

    @type String
    @default null
  */
  contentGroupExampleViewKey: null,

  /**
    Invoked when the user double clicks on an item (or single clicks of
    actOnSelect is true)

    Set this to the name of the action you want to send down the
    responder chain when the user double clicks on an item (or single clicks
    if `actOnSelect` is true).  You can optionally specify a specific target as
    well using the target property.

    If you do not specify an action, then the collection view will also try to
    invoke the action named on the target item view.

    Older versions of SproutCore expected the action property to contain an
    actual function that would be run.  This format is still supported but is
    deprecated for future use.  You should generally use the responder chain
    to handle your action for you.

    @type String
    @default null
  */
  action: null,

  /**
    Optional target to send the action to when the user double clicks.

    If you set the action property to the name of an action, you can
    optionally specify the target object you want the action to be sent to.
    This can be either an actual object or a property path that will resolve
    to an object at the time that the action is invoked.

    This property is ignored if you use the deprecated approach of making the
    action property a function.

    @type String|Object
    @default null
  */
  target: null,

  /**
    Property on content items to use for display.

    Built-in item views such as the `LabelView`s and `ImageView`s will use the
    value of this property as a key on the content object to determine the
    value they should display.

    For example, if you set `contentValueKey` to 'name' and set the
    exampleView to an `SC.LabelView`, then the label views created by the
    collection view will display the value of the content.name.

    If you are writing your own custom item view for a collection, you can
    get this behavior automatically by including the SC.Control mixin on your
    view.  You can also ignore this property if you like.  The collection view
    itself does not use this property to impact rendering.

    @type String
    @default null
  */
  contentValueKey: null,

  /**
    Enables keyboard-based navigate, deletion, etc. if set to true.

    @type Boolean
    @default NO
  */
  acceptsFirstResponder: NO,

  /**
    Changing this property value by default will cause the `CollectionView` to
    add/remove an 'active' class name to the root element.

    @type Boolean
    @default NO
  */
  isActive: NO,


  /**
    This property is used to store the calculated height to have
    a consistent scrolling behavior due to the issues generated by using top
    instead of `scrollTop`. We could look at the min-height set in the view, but
    to avoid performance hits we simply store it and the scrollView will use it if
    different than 0.

    @type Number
    @default 0
  */
  calculatedHeight: 0,

  /**
    This property is used to store the calculated width to have
    a consistent scrolling behavior due to the issues generated by using left
    instead of `scrollLeft`. We could look at the min-width set in the view, but
    to avoid performance hits we simply store it and the scrollView will use it if
    different than 0.

    @type Number
    @default 0
  */
  calculatedWidth: 0,


  // ..........................................................
  // SUBCLASS METHODS
  //

  /**
    Adjusts the layout of the view according to the computed layout.  Call
    this method to apply the computed layout to the view.
  */
  adjustLayout: function () {
    var layout = this.computeLayout();
    if (layout) { this.adjust(layout); }
  },

  /**
    Override to return the computed layout dimensions of the collection view.
    You can omit any dimensions you don't care about setting in your
    computed value.

    This layout is automatically applied whenever the content changes.

    If you don't care about computing the layout at all, you can return null.

    @returns {Hash} layout properties
  */
  computeLayout: function () {
    return null;
  },

  /**
    Override to compute the layout of the itemView for the content at the
    specified index.  This layout will be applied to the view just before it
    is rendered.

    @param {Number} contentIndex the index of content being rendered by
      itemView
    @returns {Hash} a view layout
  */
  layoutForContentIndex: function (contentIndex) {
    return null;
  },

  /**
    This computed property returns an index set selecting all content indexes.
    It will recompute anytime the length of the collection view changes.

    This is used by the default `contentIndexesInRect()` implementation.

    @field
    @type SC.IndexSet
    @observes length
  */
  allContentIndexes: function () {
    return SC.IndexSet.create(0, this.get('length')).freeze();
  }.property('length').cacheable(),

  /**
    Override to return an IndexSet with the indexes that are at least
    partially visible in the passed rectangle.  This method is used by the
    default implementation of `computeNowShowing()` to determine the new
    `nowShowing` range after a scroll.

    Override this method to implement incremental rendering.

    @param {Rect} rect the visible rect
    @returns {SC.IndexSet} now showing indexes
  */
  contentIndexesInRect: function (rect) {
    return null; // select all
  },

  /**
    Compute the nowShowing index set.  The default implementation simply
    returns the full range.  Override to implement incremental rendering.

    You should not normally call this method yourself.  Instead get the
    nowShowing property.

    @returns {SC.IndexSet} new now showing range
  */
  computeNowShowing: function (clippingFrame) {
    var r = this.contentIndexesInRect(clippingFrame);
    if (!r) r = this.get('allContentIndexes'); // default show all

    // make sure the index set doesn't contain any indexes greater than the
    // actual content.
    else {
      var len = this.get('length'),
          max = r.get('max');
      if (max > len) r = r.copy().remove(len, max - len).freeze();
    }

    return r;
  },

  /**
    Override to show the insertion point during a drag.

    Called during a drag to show the insertion point.  Passed value is the
    item view that you should display the insertion point before.  If the
    passed value is `null`, then you should show the insertion point *AFTER* that
    last item view returned by the itemViews property.

    Once this method is called, you are guaranteed to also receive a call to
    `hideInsertionPoint()` at some point in the future.

    The default implementation of this method does nothing.

    @param itemView {SC.ClassicView} view the insertion point should appear directly before. If null, show insertion point at end.
    @param dropOperation {Number} the drop operation.  will be SC.DROP_BEFORE, SC.DROP_AFTER, or SC.DROP_ON

    @returns {void}
  */
  showInsertionPoint: function (itemView, dropOperation) {},

  /**
    Override to hide the insertion point when a drag ends.

    Called during a drag to hide the insertion point.  This will be called
    when the user exits the view, cancels the drag or completes the drag.  It
    will not be called when the insertion point changes during a drag.

    You should expect to receive one or more calls to
    `showInsertionPointBefore()` during a drag followed by at least one call to
    this method at the end.  Your method should not raise an error if it is
    called more than once.

    @returns {void}
  */
  hideInsertionPoint: function () {},


  // ..........................................................
  // DELEGATE SUPPORT
  //


  /**
    Delegate used to implement fine-grained control over collection view
    behaviors.

    You can assign a delegate object to this property that will be consulted
    for various decisions regarding drag and drop, selection behavior, and
    even rendering.  The object you place here must implement some or all of
    the `SC.CollectionViewDelegate` mixin.

    If you do not supply a delegate but the content object you set implements
    the `SC.CollectionViewDelegate` mixin, then the content will be
    automatically set as the delegate.  Usually you will work with a
    `CollectionView` in this way rather than setting a delegate explicitly.

    @type SC.CollectionViewDelegate
    @default null
  */
  delegate: null,

  /**
    The delegate responsible for handling selection changes.  This property
    will be either the delegate, content, or the collection view itself,
    whichever implements the `SC.CollectionViewDelegate` mixin.

    @field
    @type Object
  */
  selectionDelegate: function () {
    var del = this.get('delegate'), content = this.get('content');
    return this.delegateFor('isCollectionViewDelegate', del, content);
  }.property('delegate', 'content').cacheable(),

  /**
    The delegate responsible for providing additional display information
    about the content.  If you bind a collection view to a controller, this
    the content will usually also be the content delegate, though you
    could implement your own delegate if you prefer.

    @field
    @type Object
  */
  contentDelegate: function () {
    var del = this.get('delegate'), content = this.get('content');
    return this.delegateFor('isCollectionContent', del, content);
  }.property('delegate', 'content').cacheable(),


  // ..........................................................
  // CONTENT CHANGES
  //

  /**
    Called whenever the content array or an item in the content array or a
    property on an item in the content array changes.  Reloads the appropriate
    item view when the content array itself changes or calls
    `contentPropertyDidChange()` if a property changes.

    Normally you will not call this method directly though you may override
    it if you need to change the way changes to observed ranges are handled.

    @param {SC.Array} content the content array generating the change
    @param {Object} object the changed object
    @param {String} key the changed property or '[]' or an array change
    @param {SC.IndexSet} indexes affected indexes or null for all items
    @returns {void}
  */
  contentRangeDidChange: function (content, object, key, indexes) {
    if (!object && (key === '[]')) {
      this.notifyPropertyChange('_contentGroupIndexes');
      this.reload(indexes); // note: if indexes == null, reloads all
    } else {
      this.contentPropertyDidChange(object, key, indexes);
    }
  },

  /**
    Called whenever a property on an item in the content array changes.  This
    is only called if you have set `observesContentProperties` to `YES`.

    Override this property if you want to do some custom work whenever a
    property on a content object changes.

    The default implementation does nothing.

    @param {Object} target the object that changed
    @param {String} key the property that changed value
    @param {SC.IndexSet} indexes the indexes in the content array affected
    @returns {void}
  */
  contentPropertyDidChange: function (target, key, indexes) {},

  /**
    Called whenever the view needs to updates its `contentRangeObserver` to
    reflect the current nowShowing index set.  You will not usually call this
    method yourself but you may override it if you need to provide some
    custom range observer behavior.

    Note that if you do implement this method, you are expected to maintain
    the range observer object yourself.  If a range observer has not been
    created yet, this method should create it.  If an observer already exists
    this method should update it.

    When you create a new range observer, the observer must eventually call
    `contentRangeDidChange()` for the collection view to function properly.

    If you override this method you probably also need to override
    `destroyRangeObserver()` to cleanup any existing range observer.

    @returns {void}
  */
  updateContentRangeObserver: function () {
    var nowShowing = this.get('nowShowing'),
        observer   = this._cv_contentRangeObserver,
        content    = this.get('content');

    if (!content) return; // nothing to do

    if (observer) {
      content.updateRangeObserver(observer, nowShowing);
    } else {
      var func = this.contentRangeDidChange;
      observer = content.addRangeObserver(nowShowing, this, func, null);

      // Cache the range observer so we can clean it up later.
      this._cv_contentRangeObserver = observer;
    }

  },

  /**
    Called whever the view needs to invalidate the current content range
    observer.  This is called whenever the content array changes.  You will
    not usually call this method yourself but you may override it if you
    provide your own range observer behavior.

    Note that if you override this method you should probably also override
    `updateRangeObserver()` to create or update a range observer as needed.

    @returns {void}
  */
  removeContentRangeObserver: function () {
    var content  = this.get('content'),
        observer = this._cv_contentRangeObserver;

    if (observer) {
      if (content) content.removeRangeObserver(observer);
      this._cv_contentRangeObserver = null;
    }
  },

  /**
    Called whenever the content length changes.  This will invalidate the
    length property of the view itself causing the `nowShowing` to recompute
    which will in turn update the UI accordingly.

    @returns {void}
  */
  contentLengthDidChange: function () {
    var content = this.get('content');
    this.set('length', content ? content.get('length') : 0);
    this.invokeOnce(this.adjustLayout);
  },

  /** @private
    Whenever content property changes to a new value:

      - remove any old observers
      - setup new observers (maybe wait until end of runloop to do this?)
      - recalc height/reload content
      - set content as delegate if delegate was old content
      - reset selection

    Whenever content array mutates:

      - possibly stop observing property changes on objects, observe new objs
      - reload effected item views
      - update layout for receiver
  */
  _cv_contentDidChange: function () {
    var content = this.get('content'),
        lfunc   = this.contentLengthDidChange;

    if (content === this._content) return; // nothing to do

    // cleanup old content
    this.removeContentRangeObserver();
    if (this._content) {
      this._content.removeObserver('length', this, lfunc);
    }

    // Destroy all pooled views.
    if (this._pools) {
      for (var key in this._pools) {
        this._pools[key].invoke('destroy');
      }
      delete this._pools;
    }

    // cache
    this._content = content;

    // add new observers - range observer will be added lazily
    if (content) {
      content.addObserver('length', this, lfunc);
    }

    // notify all items changed
    this.contentLengthDidChange();
    this.contentRangeDidChange(content, null, '[]', null);
  }.observes('content'),

  // ..........................................................
  // ITEM VIEWS
  //

  /** @private
    The indexes that need to be reloaded.  Must be one of YES, NO, or an
    SC.IndexSet.
  */
  _invalidIndexes: NO,

  /** @private
    We need to reload if isEnabled, isEditable, canEditContent, canReorderContent or
    canDeleteContent change.
  */
  _isEnabledDidChange: function () {
    // Reload the nowShowing indexes.
    this.reload();
  }.observes('isEnabled', 'isEditable', 'canEditContent', 'canReorderContent', 'canDeleteContent'),

  /**
    Regenerates the item views for the content items at the specified indexes.
    If you pass null instead of an index set, regenerates all item views.

    This method is called automatically whenever the content array changes in
    an observable way, but you can call its yourself also if you need to
    refresh the collection view for some reason.

    Note that if the length of the content is shorter than the child views
    and you call this method, then the child views will be removed no matter
    what the index.

    @param {SC.IndexSet} indexes
    @returns {SC.CollectionView} receiver
  */
  reload: function (indexes) {
    var invalid = this._invalidIndexes;
    if (indexes && invalid !== YES) {
      if (invalid) invalid.add(indexes);
      else invalid = this._invalidIndexes = indexes.clone();

    }
    else {
      this._invalidIndexes = YES; // force a total reload
    }

    if (this.get('isVisibleInWindow')) this.invokeOnce(this.reloadIfNeeded);

    return this;
  },

  /**
    Invoked once per runloop to actually reload any needed item views.
    You can call this method at any time to actually force the reload to
    happen immediately if any item views need to be reloaded.

    @returns {SC.CollectionView} receiver
  */
  reloadIfNeeded: function () {
    var invalid = this._invalidIndexes;
    if (!invalid || !this.get('isVisibleInWindow')) return this; // delay
    this._invalidIndexes = NO;

    var len, existing,
      nowShowing = this.get('nowShowing'),
      itemViews = this._sc_itemViews || [],
      idx;

    // if the set is defined but it contains the entire nowShowing range, just
    // replace
    if (invalid.isIndexSet && invalid.contains(nowShowing)) invalid = YES;

    // if an index set, just update indexes
    if (invalid.isIndexSet) {

      // Go through the invalid indexes and determine if the matching views
      // should be redrawn (exists and still showing), should be created (
      // doesn't exist and now showing) or should be destroyed (exists and no
      // longer showing).
      invalid.forEach(function (idx) {
        // Get the existing item view, if there is one.
        existing = itemViews[idx];
        if (existing) {
          // Exists so remove it (may send to pool).
          this._removeItemView(existing, idx);
        }

        // Create it (may fetch from pool).
        if (nowShowing.contains(idx)) {
          this.itemViewForContentIndex(idx, YES);
        }
      }, this);

    // if set is NOT defined, replace entire content with nowShowing
    } else {

      // Process the removals.
      for (idx = 0, len = itemViews.length;  idx < len; idx++) {
        // Get the existing item view, if there is one.
        existing = itemViews ? itemViews[idx] : null;
        if (existing) {
          this._removeItemView(existing, idx);
        }
      }

      // Only after the children are removed should we create the new views.
      // We do this in order to maximize the chance of re-use should the view
      // be marked as such.
      nowShowing.forEach(function (idx) {
        this.itemViewForContentIndex(idx, YES);
      }, this);
    }

    return this;
  },

  /** @private */
  _TMP_ATTRS: {},

  /** @private */
  _COLLECTION_CLASS_NAMES: ['sc-collection-item', 'sc-item'],

  /** @private */
  _GROUP_COLLECTION_CLASS_NAMES: ['sc-collection-item', 'sc-group-item'],

  /**
    Returns the item view for the content object at the specified index. Call
    this method instead of accessing child views directly whenever you need
    to get the view associated with a content index.

    Although this method take two parameters, you should almost always call
    it with just the content index.  The other two parameters are used
    internally by the CollectionView.

    If you need to change the way the collection view manages item views
    you can override this method as well.  If you just want to change the
    default options used when creating item views, override createItemView()
    instead.

    Note that if you override this method, then be sure to implement this
    method so that it uses a cache to return the same item view for a given
    index unless "force" is YES.  In that case, generate a new item view and
    replace the old item view in your cache with the new item view.

    @param {Number} idx the content index
    @param {Boolean} rebuild internal use only
    @returns {SC.View} instantiated view
  */
  itemViewForContentIndex: function (idx, rebuild) {
    var ret,
      views;

    // Initialize internal views cache.
    views = this._sc_itemViews;
    if (!views) { views = this._sc_itemViews = []; }

    // Use an existing view for this index if we have it and aren't rebuilding all.
    ret = views[idx];
    if (ret) {
      if (rebuild) {
        ret.destroy();
        ret = null;
      } else {
        return ret;
      }
    }

    var attrs,
      containerView = this.get('containerView') || this,
      exampleView,
      pool,
      prototype;

    // Set up the attributes for the view.
    attrs = this._attrsForContentIndex(idx);

    // If the view is reusable and there is an appropriate view inside the
    // pool, simply reuse it to avoid having to create a new view.
    exampleView = this._exampleViewForContentIndex(idx);
    prototype = exampleView.prototype;
    if (SC.none(prototype.isReusable) || prototype.isReusable) {
      pool = this._poolForExampleView(exampleView);

      // Is there a view we can re-use?
      if (pool.length > 0) {
        ret = pool.shift();

        // Reconfigure the view.
        this._reconfigureItemView(ret, attrs);

        // Awake the view.
        if (ret.awakeFromPool) { ret.awakeFromPool(this); }

        // Recreate the layer if it was destroyed.
        if (!ret.get('_isRendered')) {
          ret.invokeOnce(ret._doRender);
        }
      }
    }

    // If we weren't able to re-use a view, then create a new one.
    if (!ret) {
      ret = this.createItemView(exampleView, idx, attrs);
      containerView.insertBefore(ret, null);   // Equivalent to 'append()', but avoids one more function call
    }

    views[idx] = ret;
    return ret;
  },

  /**
    Helper method for getting the item view of a specific content object

    @param {Object} object
  */
  itemViewForContentObject: function (object) {
    return this.itemViewForContentIndex(this.get('content').indexOf(object));
  },

  /** @private */
  _TMP_LAYERID: [],

  /**
    Primitive to instantiate an item view.  You will be passed the class
    and a content index.  You can override this method to perform any other
    one time setup.

    Note that item views may be created somewhat frequently so keep this fast.

    *IMPORTANT:* The attrs hash passed is reused each time this method is
    called.   If you add properties to this hash be sure to delete them before
    returning from this method.

    @param {Class} exampleClass example view class
    @param {Number} idx the content index
    @param {Hash} attrs expected attributes
    @returns {SC.View} item view instance
  */
  createItemView: function (exampleClass, idx, attrs) {
    return exampleClass.create(attrs);
  },

  /**
    Generates a layerId for the passed index and item.  Usually the default
    implementation is suitable.

    @param {Number} idx the content index
    @returns {String} layer id, must be suitable for use in HTML id attribute
  */
  layerIdFor: function (idx) {
    var ret = this._TMP_LAYERID;
    ret[0] = SC.guidFor(this);
    ret[1] = idx;
    return ret.join('-');
  },

  /**
    Extracts the content index from the passed layerId.  If the layer id does
    not belong to the receiver or if no value could be extracted, returns NO.

    @param {String} id the layer id
  */
  contentIndexForLayerId: function (id) {
    if (!id || !(id = id.toString())) return null; // nothing to do

    var base = this._baseLayerId;
    if (!base) base = this._baseLayerId = SC.guidFor(this) + "-";

    // no match
    if ((id.length <= base.length) || (id.indexOf(base) !== 0)) return null;
    var ret = Number(id.slice(id.lastIndexOf('-') + 1));
    return isNaN(ret) ? null : ret;
  },


  /**
    Find the first content item view for the passed event.

    This method will go up the view chain, starting with the view that was the
    target of the passed event, looking for a child item.  This will become
    the view that is selected by the mouse event.

    This method only works for mouseDown & mouseUp events.  mouseMoved events
    do not have a target.

    @param {SC.Event} evt An event
    @returns {SC.View} the item view or null
  */
  itemViewForEvent: function (evt) {
    var responder = this.getPath('pane.rootResponder');
    if (!responder) return null; // fast path

    var element = evt.target,
        layer   = this.get('layer'),
        contentIndex = null,
        id;

    // walk up the element hierarchy until we find this or an element with an
    // id matching the base guid (i.e. a collection item)
    while (element && element !== document && element !== layer) {
      id = element ? SC.$(element).attr('id') : null;
      if (id && (contentIndex = this.contentIndexForLayerId(id)) !== null) {
        break;
      }
      element = element.parentNode;
    }

    // no matching element found?
    if (contentIndex === null || (element === layer)) {
      element = layer = null; // avoid memory leaks
      return null;
    }

    // okay, found the DOM node for the view, go ahead and create it
    // first, find the contentIndex
    if (contentIndex >= this.get('length')) {
      throw new Error("layout for item view %@ was found when item view does not exist (%@)".fmt(id, this));
    }

    return this.itemViewForContentIndex(contentIndex);
  },

  // ..........................................................
  // DISCLOSURE SUPPORT
  //

  /**
    Expands any items in the passed selection array that have a disclosure
    state.

    @param {SC.IndexSet} indexes the indexes to expand
    @returns {SC.CollectionView} receiver
  */
  expand: function (indexes) {
    if (!indexes) return this; // nothing to do
    var del     = this.get('contentDelegate'),
        content = this.get('content');

    indexes.forEach(function (i) {
      var state = del.contentIndexDisclosureState(this, content, i);
      if (state === SC.BRANCH_CLOSED) del.contentIndexExpand(this, content, i);
    }, this);
    return this;
  },

  /**
    Collapses any items in the passed selection array that have a disclosure
    state.

    @param {SC.IndexSet} indexes the indexes to expand
    @returns {SC.CollectionView} receiver
  */
  collapse: function (indexes) {
    if (!indexes) return this; // nothing to do
    var del     = this.get('contentDelegate'),
        content = this.get('content');

    indexes.forEach(function (i) {
      var state = del.contentIndexDisclosureState(this, content, i);
      if (state === SC.BRANCH_OPEN) del.contentIndexCollapse(this, content, i);
    }, this);
    return this;
  },

  // ..........................................................
  // SELECTION SUPPORT
  //

  /** @private
    Called whenever the selection object is changed to a new value.  Begins
    observing the selection for changes.
  */
  _cv_selectionDidChange: function () {
    var sel  = this.get('selection'),
        last = this._cv_selection,
        func = this._cv_selectionContentDidChange;

    if (sel === last) return; // nothing to do
    if (last) last.removeObserver('[]', this, func);
    if (sel) sel.addObserver('[]', this, func);

    this._cv_selection = sel;
    this._cv_selectionContentDidChange();
  }.observes('selection'),

  /** @private
    Called whenever the selection object or its content changes.  This will
    repaint any items that changed their selection state.
  */
  _cv_selectionContentDidChange: function () {
    var sel  = this.get('selection'),
        last = this._cv_selindexes, // clone of last known indexes
        content = this.get('content'),
        diff;

    // save new last
    this._cv_selindexes = sel ? sel.frozenCopy() : null;

    // determine which indexes are now invalid
    if (last) last = last.indexSetForSource(content);
    if (sel) sel = sel.indexSetForSource(content);

    if (sel && last) diff = sel.without(last).add(last.without(sel));
    else diff = sel || last;

    if (diff && diff.get('length') > 0) this.reloadSelectionIndexes(diff);
  },

  /** @private
    Contains the current item views that need their selection to be repainted.
    This may be either NO, YES, or an IndexSet.
  */
  _invalidSelection: NO,

  /**
    Called whenever the selection changes.  The passed index set will contain
    any affected indexes including those indexes that were previously
    selected and now should be deselected.

    Pass null to reload the selection state for all items.

    @param {SC.IndexSet} indexes affected indexes
    @returns {SC.CollectionView} receiver
  */
  reloadSelectionIndexes: function (indexes) {
    var invalid = this._invalidSelection;
    if (indexes && (invalid !== YES)) {
      if (invalid) { invalid.add(indexes); }
      else { invalid = this._invalidSelection = indexes.copy(); }

    } else this._invalidSelection = YES; // force a total reload

    if (this.get('isVisibleInWindow')) {
      this.invokeOnce(this.reloadSelectionIndexesIfNeeded);
    }

    return this;
  },

  /**
    Reloads the selection state if needed on any dirty indexes.  Normally this
    will run once at the end of the runloop, but you can force the item views
    to reload their selection immediately by calling this method.

    You can also override this method if needed to change the way the
    selection is reloaded on item views.  The default behavior will simply
    find any item views in the nowShowing range that are affected and
    modify them.

    @returns {SC.CollectionView} receiver
  */
  reloadSelectionIndexesIfNeeded: function () {
    var invalid = this._invalidSelection;
    if (!invalid || !this.get('isVisibleInWindow')) return this;

    var nowShowing = this.get('nowShowing'),
        reload     = this._invalidIndexes,
        content    = this.get('content'),
        sel        = this.get('selection');

    this._invalidSelection = NO; // reset invalid

    // fast path.  if we are going to reload everything anyway, just forget
    // about it.  Also if we don't have a nowShowing, nothing to do.
    if (reload === YES || !nowShowing) return this;

    // if invalid is YES instead of index set, just reload everything
    if (invalid === YES) invalid = nowShowing;

    // if we will reload some items anyway, don't bother
    if (reload && reload.isIndexSet) invalid = invalid.without(reload);

    // iterate through each item and set the isSelected state.
    invalid.forEach(function (idx) {
      if (!nowShowing.contains(idx)) return; // not showing
      var view = this.itemViewForContentIndex(idx, NO);
      if (view) view.set('isSelected', sel ? sel.contains(content, idx) : NO);
    }, this);

    return this;
  },

  /**
    Selection primitive.  Selects the passed IndexSet of items, optionally
    extending the current selection.  If extend is NO or not passed then this
    will replace the selection with the passed value.  Otherwise the indexes
    will be added to the current selection.

    @param {Number|SC.IndexSet} indexes index or indexes to select
    @param extend {Boolean} optionally extend the selection
    @returns {SC.CollectionView} receiver
  */
  select: function (indexes, extend) {
    var content = this.get('content'),
        del     = this.get('selectionDelegate'),
        groupIndexes = this.get('_contentGroupIndexes'),
        sel;

    if (!this.get('isSelectable') || !this.get('isEnabledInPane')) return this;

    // normalize
    if (SC.typeOf(indexes) === SC.T_NUMBER) {
      indexes = SC.IndexSet.create(indexes, 1);
    }

    // if we are passed an empty index set or null, clear the selection.
    if (indexes && indexes.get('length') > 0) {

      // first remove any group indexes - these can never be selected
      if (groupIndexes && groupIndexes.get('length') > 0) {
        indexes = indexes.copy().remove(groupIndexes);
      }

      // give the delegate a chance to alter the items
      indexes = del.collectionViewShouldSelectIndexes(this, indexes, extend);
      if (!indexes || indexes.get('length') === 0) return this; // nothing to do

    } else indexes = null;

    // build the selection object, merging if needed
    if (extend && (sel = this.get('selection'))) sel = sel.copy();
    else sel = SC.SelectionSet.create();

    if (indexes && indexes.get('length') > 0) {

      // when selecting only one item, always select by content
      if (indexes.get('length') === 1) {
        sel.addObject(content.objectAt(indexes.get('firstObject')));

      // otherwise select an index range
      } else sel.add(content, indexes);

    }

    // give delegate one last chance
    sel = del.collectionViewSelectionForProposedSelection(this, sel);
    if (!sel) sel = SC.SelectionSet.create(); // empty

    // if we're not extending the selection, clear the selection anchor
    this._selectionAnchor = null;
    this.set('selection', sel.freeze());
    return this;
  },

  /**
    Primitive to remove the indexes from the selection.

    @param {Number|SC.IndexSet} indexes index or indexes to deselect
    @returns {SC.CollectionView} receiver
  */
  deselect: function (indexes) {
    var sel     = this.get('selection'),
        content = this.get('content'),
        del     = this.get('selectionDelegate');

    if (!this.get('isSelectable') || !this.get('isEnabledInPane')) return this;
    if (!sel || sel.get('length') === 0) return this; // nothing to do

    // normalize
    if (SC.typeOf(indexes) === SC.T_NUMBER) {
      indexes = SC.IndexSet.create(indexes, 1);
    }

    // give the delegate a chance to alter the items
    indexes = del.collectionViewShouldDeselectIndexes(this, indexes);
    if (!indexes || indexes.get('length') === 0) return this; // nothing to do

    // now merge change - note we expect sel && indexes to not be null
    sel = sel.copy().remove(content, indexes);
    sel = del.collectionViewSelectionForProposedSelection(this, sel);
    if (!sel) sel = SC.SelectionSet.create(); // empty

    this.set('selection', sel.freeze());
    return this;
  },

  /** @private
   Finds the next selectable item, up to content length, by asking the
   delegate. If a non-selectable item is found, the index is skipped. If
   no item is found, selection index is returned unmodified.

   Return value will always be in the range of the bottom of the current
   selection index and the proposed index.

   @param {Number} proposedIndex the desired index to select
   @param {Number} bottom optional bottom of selection use as fallback
   @returns {Number} next selectable index.
  */
  _findNextSelectableItemFromIndex: function (proposedIndex, bottom) {
    var lim     = this.get('length'),
        range   = SC.IndexSet.create(),
        del     = this.get('selectionDelegate'),
        groupIndexes = this.get('_contentGroupIndexes'),
        ret, sel;

    // fast path
    if (!groupIndexes && (del.collectionViewShouldSelectIndexes === this.collectionViewShouldSelectIndexes)) {
      return proposedIndex;
    }

    // loop forwards looking for an index that is allowed by delegate
    // we could alternatively just pass the whole range but this might be
    // slow for the delegate
    while (proposedIndex < lim) {
      if (!groupIndexes || !groupIndexes.contains(proposedIndex)) {
        range.add(proposedIndex);
        ret = del.collectionViewShouldSelectIndexes(this, range);
        if (ret && ret.get('length') >= 1) return proposedIndex;
        range.remove(proposedIndex);
      }
      proposedIndex++;
    }

    // if nothing was found, return top of selection
    if (bottom === undefined) {
      sel = this.get('selection');
      bottom = sel ? sel.get('max') : -1;
    }
    return bottom;
  },

  /** @private
   Finds the previous selectable item, up to the first item, by asking the
   delegate. If a non-selectable item is found, the index is skipped. If
   no item is found, selection index is returned unmodified.

   @param {Integer} proposedIndex the desired index to select
   @returns {Integer} the previous selectable index. This will always be in the range of the top of the current selection index and the proposed index.
  */
  _findPreviousSelectableItemFromIndex: function (proposedIndex, top) {
    var range   = SC.IndexSet.create(),
        del     = this.get('selectionDelegate'),
        groupIndexes = this.get('_contentGroupIndexes'),
        ret;

    if (SC.none(proposedIndex)) proposedIndex = -1;

    // fast path
    if (!groupIndexes && (del.collectionViewShouldSelectIndexes === this.collectionViewShouldSelectIndexes)) {
      return proposedIndex;
    }

    // loop backwards looking for an index that is allowed by delegate
    // we could alternatively just pass the whole range but this might be
    // slow for the delegate
    while (proposedIndex >= 0) {
      if (!groupIndexes || !groupIndexes.contains(proposedIndex)) {
        range.add(proposedIndex);
        ret = del.collectionViewShouldSelectIndexes(this, range);
        if (ret && ret.get('length') >= 1) return proposedIndex;
        range.remove(proposedIndex);
      }
      proposedIndex--;
    }

    // if nothing was found, return top of selection
    if (top === undefined) {
      var sel = this.get('selection');
      top = sel ? sel.get('min') : -1;
    }
    if (SC.none(top)) top = -1;
    return top;
  },

  /**
    Select one or more items before the current selection, optionally
    extending the current selection.  Also scrolls the selected item into
    view.

    Selection does not wrap around.

    @param {Boolean} [extend] If true, the selection will be extended
      instead of replaced. Defaults to false.
    @param {Integer} [numberOfItems] The number of previous to be
      selected.  Defaults to 1
    @returns {SC.CollectionView} receiver
  */
  selectPreviousItem: function (extend, numberOfItems) {
    if (SC.none(numberOfItems)) numberOfItems = 1;
    if (SC.none(extend)) extend = false;

    var sel     = this.get('selection'),
        content = this.get('content');
    if (sel) sel = sel.indexSetForSource(content);

    var selTop    = sel ? sel.get('min') : -1,
        selBottom     = sel ? sel.get('max') - 1 : -1,
        anchor        = this._selectionAnchor;
    if (SC.none(anchor)) anchor = selTop;

    // if extending, then we need to do some fun stuff to build the array
    if (extend) {

      // If the selBottom is after the anchor, then reduce the selection
      if (selBottom > anchor) {
        selBottom = selBottom - numberOfItems;

      // otherwise, select the previous item from the top
      } else {
        selTop = this._findPreviousSelectableItemFromIndex(selTop - numberOfItems);
      }

      // Ensure we are not out of bounds
      if (SC.none(selTop) || (selTop < 0)) selTop = 0;
      if (!content.objectAt(selTop)) selTop = sel ? sel.get('min') : -1;
      if (selBottom < selTop) selBottom = selTop;

    // if not extending, just select the item previous to the selTop
    } else {
      selTop = this._findPreviousSelectableItemFromIndex(selTop - numberOfItems);
      if (SC.none(selTop) || (selTop < 0)) selTop = 0;
      if (!content.objectAt(selTop)) selTop = sel ? sel.get('min') : -1;
      selBottom = selTop;
      anchor = null;
    }

    var scrollToIndex = selTop;

    // now build new selection
    sel = SC.IndexSet.create(selTop, selBottom + 1 - selTop);

    // ensure that the item is visible and set the selection
    this.scrollToContentIndex(scrollToIndex);
    this.select(sel);
    this._selectionAnchor = anchor;
    return this;
  },

  /**
    Select one or more items following the current selection, optionally
    extending the current selection.  Also scrolls to selected item.

    Selection does not wrap around.

    @param {Boolean} [extend] If true, the selection will be extended
      instead of replaced. Defaults to false.
    @param {Integer} [numberOfItems] The number of items to be
      selected. Defaults to 1.
    @returns {SC.CollectionView} receiver
  */
  selectNextItem: function (extend, numberOfItems) {
    if (SC.none(numberOfItems)) numberOfItems = 1;
    if (SC.none(extend)) extend = false;

    var sel     = this.get('selection'),
        content = this.get('content');
    if (sel) sel = sel.indexSetForSource(content);

    var selTop    = sel ? sel.get('min') : -1,
        selBottom = sel ? sel.get('max') - 1 : -1,
        anchor    = this._selectionAnchor,
        lim       = this.get('length');

    if (SC.none(anchor)) anchor = selTop;

    // if extending, then we need to do some fun stuff to build the array
    if (extend) {

      // If the selTop is before the anchor, then reduce the selection
      if (selTop < anchor) {
        selTop = selTop + numberOfItems;

      // otherwise, select the next item after the bottom
      } else {
        selBottom = this._findNextSelectableItemFromIndex(selBottom + numberOfItems, selBottom);
      }

      // Ensure we are not out of bounds
      if (selBottom >= lim) selBottom = lim - 1;

      // we also need to check that the item exists
      if (!content.objectAt(selBottom)) selBottom = sel ? sel.get('max') - 1 : -1;

      // and if top has eclipsed bottom, handle that too.
      if (selTop > selBottom) selTop = selBottom;

    // if not extending, just select the item next to the selBottom
    } else {
      selBottom = this._findNextSelectableItemFromIndex(selBottom + numberOfItems, selBottom);

      if (selBottom >= lim) selBottom = lim - 1;
      if (!content.objectAt(selBottom)) selBottom = sel ? sel.get('max') - 1 : -1;
      selTop = selBottom;
      anchor = null;
    }

    var scrollToIndex = selBottom;

    // now build new selection
    sel = SC.IndexSet.create(selTop, selBottom - selTop + 1);

    // ensure that the item is visible and set the selection
    this.scrollToContentIndex(scrollToIndex);
    this.select(sel);
    this._selectionAnchor = anchor;
    return this;
  },

  /**
    Deletes the selected content if canDeleteContent is YES.  This will invoke
    delegate methods to provide fine-grained control.  Returns YES if the
    deletion was possible, even if none actually occurred.

    @returns {Boolean} YES if deletion is possible.
  */
  deleteSelection: function () {
    // perform some basic checks...
    if (!this.get('isEditable') || !this.get('canDeleteContent')) return NO;

    var sel     = this.get('selection'),
        content = this.get('content'),
        del     = this.get('selectionDelegate'),
        indexes = sel && content ? sel.indexSetForSource(content) : null;

    if (!content || !indexes || indexes.get('length') === 0) return NO;

    // let the delegate decide what to actually delete.  If this returns an
    // empty index set or null, just do nothing.
    indexes = del.collectionViewShouldDeleteIndexes(this, indexes);
    if (!indexes || indexes.get('length') === 0) return NO;

    // now have the delegate (or us) perform the deletion. The default
    // delegate implementation just uses standard SC.Array methods to do the
    // right thing.
    del.collectionViewDeleteContent(this, this.get('content'), indexes);

    return YES;
  },

  // ..........................................................
  // SCROLLING
  //

  /**
    Scroll the rootElement (if needed) to ensure that the item is visible.

    @param {Number} contentIndex The index of the item to scroll to
    @returns {SC.CollectionView} receiver
  */
  scrollToContentIndex: function (contentIndex) {
    var itemView = this.itemViewForContentIndex(contentIndex);
    if (itemView) this.scrollToItemView(itemView);
    return this;
  },

  /**
    Scroll to the passed item view.  If the item view is not visible on screen
    this method will not work.

    @param {SC.View} view The item view to scroll to
    @returns {SC.CollectionView} receiver
  */
  scrollToItemView: function (view) {
    if (view) view.scrollToVisible();
    return this;
  },

  // ..........................................................
  // KEYBOARD EVENTS
  //

  /** @private */
  keyDown: function (evt) {
    var ret = this.interpretKeyEvents(evt);
    return !ret ? NO : ret;
  },

  /** @private */
  keyUp: function () { return true; },

  /** @private
    Handle space key event.  Do action
  */
  insertText: function (chr, evt) {
    if (chr === ' ') {
      var sel = this.get('selection');
      if (sel && sel.get('length') > 0) {
        this.invokeLater(this._cv_action, 0, null, evt);
      }
      return YES;
    } else return NO;
  },

  /** @private
    Handle select all keyboard event.
  */
  selectAll: function (evt) {
    var content = this.get('content'),
        sel = content ? SC.IndexSet.create(0, content.get('length')) : null;
    this.select(sel, NO);
    return YES;
  },

  /** @private
    Remove selection of any selected items.
  */
  deselectAll: function () {
    var content = this.get('content'),
        sel = content ? SC.IndexSet.create(0, content.get('length')) : null;
    this.deselect(sel, NO);
    return YES;
  },

  /** @private
    Handle delete keyboard event.
  */
  deleteBackward: function (evt) {
    return this.deleteSelection();
  },

  /** @private
    Handle delete keyboard event.
  */
  deleteForward: function (evt) {
    return this.deleteSelection();
  },

  /** @private
    Selects the same item on the next row or moves down one if itemsPerRow = 1
  */
  moveDown: function (sender, evt) {
    this.selectNextItem(false, this.get('itemsPerRow') || 1);
    this._cv_performSelectAction(null, evt, this.ACTION_DELAY);
    return true;
  },

  /** @private
    Selects the same item on the next row or moves up one if itemsPerRow = 1
  */
  moveUp: function (sender, evt) {
    this.selectPreviousItem(false, this.get('itemsPerRow') || 1);
    this._cv_performSelectAction(null, evt, this.ACTION_DELAY);
    return true;
  },

  /** @private
    Selects the previous item if itemsPerRow > 1.  Otherwise does nothing.
    If item is expandable, will collapse.
  */
  moveLeft: function (evt) {
    // If the control key is down, this may be a browser shortcut and
    // we should not handle the arrow key.
    if (evt.ctrlKey || evt.metaKey) return NO;

    if ((this.get('itemsPerRow') || 1) > 1) {
      this.selectPreviousItem(false, 1);
      this._cv_performSelectAction(null, evt, this.ACTION_DELAY);

    } else {
      var sel     = this.get('selection'),
          content = this.get('content'),
          indexes = sel ? sel.indexSetForSource(content) : null;

      // Collapse the element if it is expanded.  However, if there is exactly
      // one item selected and the item is already collapsed or is a leaf
      // node, then select the (expanded) parent element instead as a
      // convenience to the user.
      if (indexes) {
        var del,     // We'll load it lazily
            selectParent = false,
            index;

        if (indexes.get('length') === 1) {
          index = indexes.get('firstObject');
          del = this.get('contentDelegate');
          var state = del.contentIndexDisclosureState(this, content, index);
          if (state !== SC.BRANCH_OPEN) selectParent = true;
        }

        if (selectParent) {
          // TODO:  PERFORMANCE:  It would be great to have a function like
          //        SC.CollectionView.selectParentItem() or something similar
          //        for performance reasons.  But since we don't currently
          //        have such a function, let's just iterate through the
          //        previous items until we find the first one with a outline
          //        level of one less than the selected item.
          var desiredOutlineLevel = del.contentIndexOutlineLevel(this, content, index) - 1;
          if (desiredOutlineLevel >= 0) {
            var parentIndex = -1;
            while (parentIndex < 0) {
              var previousItemIndex = this._findPreviousSelectableItemFromIndex(index - 1);
              if (previousItemIndex < 0) return false;    // Sanity-check.
              index = previousItemIndex;
              var outlineLevel = del.contentIndexOutlineLevel(this, content, index);
              if (outlineLevel === desiredOutlineLevel) {
                parentIndex = previousItemIndex;
              }
            }

            // If we found the parent, select it now.
            if (parentIndex !== -1) {
              this.select(index);
            }
          }
        }
        else {
          this.collapse(indexes);
        }
      }
    }

    return true;
  },

  /** @private
    Selects the next item if itemsPerRow > 1.  Otherwise does nothing.
  */
  moveRight: function (evt) {
    // If the control key is down, this may be a browser shortcut and
    // we should not handle the arrow key.
    if (evt.ctrlKey || evt.metaKey) return NO;

    if ((this.get('itemsPerRow') || 1) > 1) {
      this.selectNextItem(false, 1);
      this._cv_performSelectAction(null, evt, this.ACTION_DELAY);
    } else {
      var sel     = this.get('selection'),
          content = this.get('content'),
          indexes = sel ? sel.indexSetForSource(content) : null;
      if (indexes) this.expand(indexes);
    }

    return true;
  },

  /** @private */
  moveDownAndModifySelection: function (sender, evt) {
    this.selectNextItem(true, this.get('itemsPerRow') || 1);
    this._cv_performSelectAction(null, evt, this.ACTION_DELAY);
    return true;
  },

  /** @private */
  moveUpAndModifySelection: function (sender, evt) {
    this.selectPreviousItem(true, this.get('itemsPerRow') || 1);
    this._cv_performSelectAction(null, evt, this.ACTION_DELAY);
    return true;
  },

  /** @private
    Selects the previous item if itemsPerRow > 1.  Otherwise does nothing.
  */
  moveLeftAndModifySelection: function (sender, evt) {
    if ((this.get('itemsPerRow') || 1) > 1) {
      this.selectPreviousItem(true, 1);
      this._cv_performSelectAction(null, evt, this.ACTION_DELAY);
    }
    return true;
  },

  /** @private
    Selects the next item if itemsPerRow > 1.  Otherwise does nothing.
  */
  moveRightAndModifySelection: function (sender, evt) {
    if ((this.get('itemsPerRow') || 1) > 1) {
      this.selectNextItem(true, 1);
      this._cv_performSelectAction(null, evt, this.ACTION_DELAY);
    }
    return true;
  },

  /** @private
    if content value is editable and we have one item selected, then edit.
    otherwise, invoke action.
  */
  insertNewline: function (sender, evt) {
    var canEdit = this.get('isEditable') && this.get('canEditContent'),
        sel, content, set, idx, itemView;

    // first make sure we have a single item selected; get idx
    if (canEdit) {
      sel     = this.get('selection');
      content = this.get('content');
      if (sel && sel.get('length') === 1) {
        set = sel.indexSetForSource(content);
        idx = set ? set.get('min') : -1;
        canEdit = idx >= 0;
      }
    }

    // next find itemView and ensure it supports editing
    if (canEdit) {
      itemView = this.itemViewForContentIndex(idx);
      canEdit = itemView && SC.typeOf(itemView.beginEditing) === SC.T_FUNCTION;
    }

    // ok, we can edit..
    if (canEdit) {
      this.scrollToContentIndex(idx);
      itemView = this.itemViewForContentIndex(idx); // just in case
      itemView.beginEditing();

    // invoke action
    } else {
      this.invokeLater(this._cv_action, 0, itemView, null);
    }

    return YES; // always handle
  },

  insertTab: function (evt) {
    var view = this.get('nextValidKeyView');
    if (view) view.becomeFirstResponder();
    else evt.allowDefault();
    return YES; // handled
  },

  insertBacktab: function (evt) {
    var view = this.get('previousValidKeyView');
    if (view) view.becomeFirstResponder();
    else evt.allowDefault();
    return YES; // handled
  },

  // ..........................................................
  // MOUSE EVENTS
  //

  /** @private
    Handles mouse down events on the collection view or on any of its
    children.

    The default implementation of this method can handle a wide variety
    of user behaviors depending on how you have configured the various
    options for the collection view.

    @param ev {Event} the mouse down event
    @returns {Boolean} Usually YES.
  */
  mouseDown: function (ev) {
    var content = this.get('content');

    // Fast path!
    if (!content) return this.get('isSelectable');

    var itemView      = this.itemViewForEvent(ev),
        contentIndex  = itemView ? itemView.get('contentIndex') : -1,
        info, anchor, sel, isSelected, modifierKeyPressed, didSelect = NO,
        allowsMultipleSel = content.get('allowsMultipleSelection');

    if (!this.get('isEnabledInPane')) return contentIndex > -1;

    if (!this.get('isSelectable')) return NO;

    // become first responder if possible.
    this.becomeFirstResponder();

    // Toggle the selection if selectOnMouseDown is true
    if (this.get('useToggleSelection')) {
      if (this.get('selectOnMouseDown')) {
        if (!itemView) return; // do nothing when clicked outside of elements

        // determine if item is selected. If so, then go on.
        sel = this.get('selection');
        isSelected = sel && sel.containsObject(itemView.get('content'));

        if (isSelected) {
          this.deselect(contentIndex);
        } else if (!allowsMultipleSel) {
          this.select(contentIndex, NO);
          didSelect = YES;
        } else {
          this.select(contentIndex, YES);
          didSelect = YES;
        }

        if (didSelect && this.get('actOnSelect')) {
          // handle actions on editing
          this._cv_performSelectAction(itemView, ev);
        }
      }

      return YES;
    }

    // received a mouseDown on the collection element, but not on one of the
    // childItems... unless we do not allow empty selections, set it to empty.
    if (!itemView) {
      if (this.get('allowDeselectAll')) this.select(null, false);
      return YES;
    }

    // collection some basic setup info
    sel = this.get('selection');
    if (sel) sel = sel.indexSetForSource(content);

    info = this.mouseDownInfo = {
      event:        ev,
      itemView:     itemView,
      contentIndex: contentIndex,
      at:           Date.now()
    };

    isSelected = sel ? sel.contains(contentIndex) : NO;
    info.modifierKeyPressed = modifierKeyPressed = ev.ctrlKey || ev.metaKey;


    // holding down a modifier key while clicking a selected item should
    // deselect that item...deselect and bail.
    if (modifierKeyPressed && isSelected) {
      info.shouldDeselect = contentIndex >= 0;

    // if the shiftKey was pressed, then we want to extend the selection
    // from the last selected item
    } else if (ev.shiftKey && sel && sel.get('length') > 0 && allowsMultipleSel) {
      sel = this._findSelectionExtendedByShift(sel, contentIndex);
      anchor = this._selectionAnchor;
      this.select(sel);
      this._selectionAnchor = anchor; //save the anchor

    // If no modifier key was pressed, then clicking on the selected item
    // should clear the selection and reselect only the clicked on item.
    } else if (!modifierKeyPressed && isSelected) {
      info.shouldReselect = contentIndex >= 0;

    // Otherwise, if selecting on mouse down,  simply select the clicked on
    // item, adding it to the current selection if a modifier key was pressed.
    } else {

      if ((ev.shiftKey || modifierKeyPressed) && !allowsMultipleSel) {
        this.select(null, false);
      }

      if (this.get("selectOnMouseDown")) {
        this.select(contentIndex, modifierKeyPressed);
      } else {
        info.shouldSelect = contentIndex >= 0;
      }
    }

    // saved for extend by shift ops.
    info.previousContentIndex = contentIndex;

    return YES;
  },

  /** @private */
  mouseUp: function (ev) {
    var view = this.itemViewForEvent(ev),
        info = this.mouseDownInfo,
        content = this.get('content');

    // Fast path!
    if (!content) {
      this._cleanupMouseDown();
      return true;
    }

    var contentIndex = view ? view.get('contentIndex') : -1,
      sel, isSelected, canEdit, itemView, idx,
      allowsMultipleSel = content.get('allowsMultipleSelection');

    if (!this.get('isEnabledInPane')) return contentIndex > -1;
    if (!this.get('isSelectable')) return NO;

    if (this.get('useToggleSelection')) {
      // Return if clicked outside of elements or if toggle was handled by mouseDown
      if (!view || this.get('selectOnMouseDown')) return NO;

      // determine if item is selected. If so, then go on.
      sel = this.get('selection');
      isSelected = sel && sel.containsObject(view.get('content'));

      if (isSelected) {
        this.deselect(contentIndex);
      } else if (!allowsMultipleSel) {
        this.select(contentIndex, NO);
      } else {
        this.select(contentIndex, YES);
      }

    } else if (info) {
      idx = info.contentIndex;
      contentIndex = (view) ? view.get('contentIndex') : -1;

      // this will be set if the user simply clicked on an unselected item and
      // selectOnMouseDown was NO.
      if (info.shouldSelect) this.select(idx, info.modifierKeyPressed);

      // This is true if the user clicked on a selected item with a modifier
      // key pressed.
      if (info.shouldDeselect) this.deselect(idx);

      // This is true if the user clicked on a selected item without a
      // modifier-key pressed.  When this happens we try to begin editing
      // on the content.  If that is not allowed, then simply clear the
      // selection and reselect the clicked on item.
      if (info.shouldReselect) {

        // - contentValueIsEditable is true
        canEdit = this.get('isEditable') && this.get('canEditContent');

        // - the user clicked on an item that was already selected
        //   ^ this is the only way shouldReset is set to YES

        // - is the only item selected
        if (canEdit) {
          sel = this.get('selection');
          canEdit = sel && (sel.get('length') === 1);
        }

        // - the item view responds to contentHitTest() and returns YES.
        // - the item view responds to beginEditing and returns YES.
        if (canEdit) {
          itemView = this.itemViewForContentIndex(idx);
          canEdit = itemView && (!itemView.contentHitTest || itemView.contentHitTest(ev));
          canEdit = (canEdit && itemView.beginEditing) ? itemView.beginEditing() : NO;
        }

        // if cannot edit, schedule a reselect (but give doubleClick a chance)
        if (!canEdit) {
          if (this._cv_reselectTimer) this._cv_reselectTimer.invalidate();
          this._cv_reselectTimer = this.invokeLater(this.select, 300, idx, false);
        }
      }

      this._cleanupMouseDown();
    }

    // handle actions on editing
    this._cv_performSelectAction(view, ev, 0, ev.clickCount);

    return NO;  // bubble event to allow didDoubleClick to be called...
  },

  /** @private */
  _cleanupMouseDown: function () {

    // delete items explicitly to avoid leaks on IE
    var info = this.mouseDownInfo, key;
    if (info) {
      for (key in info) {
        if (!info.hasOwnProperty(key)) continue;
        delete info[key];
      }
    }
    this.mouseDownInfo = null;
  },

  /** @private */
  mouseMoved: function (ev) {
    var view = this.itemViewForEvent(ev),
        last = this._lastHoveredItem;

    // handle hover events.
    if (view !== last) {
      if (last && last.mouseExited) last.mouseExited(ev);
      if (view && view.mouseEntered) view.mouseEntered(ev);
    }
    this._lastHoveredItem = view;

    if (view && view.mouseMoved) view.mouseMoved(ev);
    return YES;
  },

  /** @private */
  mouseExited: function (ev) {
    var view = this._lastHoveredItem;
    this._lastHoveredItem = null;
    if (view && view.mouseExited) view.mouseExited(ev);
    return YES;
  },

  // ..........................................................
  // TOUCH EVENTS
  //

  /** @private */
  touchStart: function (touch, evt) {
    var itemView = this.itemViewForEvent(touch),
        contentIndex = itemView ? itemView.get('contentIndex') : -1;

    if (!this.get('isEnabledInPane')) return contentIndex > -1;

    // become first responder if possible.
    this.becomeFirstResponder();

    this._touchSelectedView = itemView;

    if (!this.get('useToggleSelection')) {
      // We're faking the selection visually here
      // Only track this if we added a selection so we can remove it later
      if (itemView && !itemView.get('isSelected')) {
        itemView.set('isSelected', YES);
      }
    }

    return YES;
  },

  /** @private */
  touchesDragged: function (evt, touches) {
    touches.forEach(function (touch) {
      if (
        Math.abs(touch.pageX - touch.startX) > 5 ||
        Math.abs(touch.pageY - touch.startY) > 5
      ) {
        // This calls touchCancelled
        touch.makeTouchResponder(touch.nextTouchResponder);
      }
    }, this);

  },

  /** @private */
  touchEnd: function (touch) {
    /*
      TODO [CC] We should be using itemViewForEvent here, but because
            ListItemView re-renders itself once isSelected is called
            in touchStart, the elements attached to this event are
            getting orphaned and this event is basically a complete
            fail when using touch events.
    */
    // var itemView = this.itemViewForEvent(touch),
    var itemView = this._touchSelectedView,
        contentIndex = itemView ? itemView.get('contentIndex') : -1,
        isSelected = NO, sel, shouldSelect;

    if (!this.get('isEnabledInPane')) return contentIndex > -1;

    if (contentIndex > -1) {
      if (this.get('useToggleSelection')) {
        sel = this.get('selection');
        isSelected = sel && sel.containsObject(itemView.get('content'));
        shouldSelect = !isSelected;
      }
      else
        shouldSelect = true;

      if (shouldSelect) {
        this.select(contentIndex, NO);

        // If actOnSelect is implemented, the action will be fired.
        this._cv_performSelectAction(itemView, touch, 0);
      } else {
        this.deselect(contentIndex);
      }
    }

    this._touchSelectedView = null;
  },

  /** @private */
  touchCancelled: function (evt) {
    // Remove fake selection
    if (this._touchSelectedView) {
      this._touchSelectedView.set('isSelected', NO);
      this._touchSelectedView = null;
    }
  },

  /** @private */
  _findSelectionExtendedByShift: function (sel, contentIndex) {

    // fast path.  if we don't have a selection, just select index
    if (!sel || sel.get('length') === 0) {
      return SC.IndexSet.create(contentIndex);
    }

    // if we do have a selection, then figure out how to extend it.
    var min     = sel.get('min'),
        max     = sel.get('max') - 1,
        anchor  = this._selectionAnchor;
    if (SC.none(anchor)) anchor = -1;

    // clicked before the current selection set... extend it's beginning...
    if (contentIndex < min) {
      min = contentIndex;
      if (anchor < 0) this._selectionAnchor = anchor = max; //anchor at end

    // clicked after the current selection set... extend it's ending...
    } else if (contentIndex > max) {
      max = contentIndex;
      if (anchor < 0) this._selectionAnchor = anchor = min; // anchor at start

    // clicked inside the selection set... need to determine where the last
    // selection was and use that as an anchor.
    } else if (contentIndex >= min && contentIndex <= max) {
      if (anchor < 0) this._selectionAnchor = anchor = min; //anchor at start

      if (contentIndex === anchor) min = max = contentIndex;
      else if (contentIndex > anchor) {
        min = anchor;
        max = contentIndex;
      } else if (contentIndex < anchor) {
        min = contentIndex;
        max = anchor;
      }
    }

    return SC.IndexSet.create(min, max - min + 1);
  },

  // ......................................
  // DRAG AND DROP SUPPORT
  //

  /**
    When reordering its content, the collection view will store its reorder
    data using this special data type.  The data type is unique to each
    collection view instance.  You can use this data type to detect reorders
    if necessary.

    @field
    @type String
  */
  reorderDataType: function () {
    return 'SC.CollectionView.Reorder.' + SC.guidFor(this);
  }.property().cacheable(),

  /**
    This property is set to the IndexSet of content objects that are the
    subject of a drag whenever a drag is initiated on the collection view.
    You can consult this property when implementing your collection view
    delegate  methods, but otherwise you should not use this property in your
    code.

    @type SC.IndexSet
    @default null
  */
  dragContent: null,

  /**
    This property is set to the proposed insertion index during a call to
    collectionViewValidateDragOperation().  Your delegate implementations can
    change the value of this property to enforce a drop some in some other
    location.

    @type Number
    @default null
  */
  proposedInsertionIndex: null,

  /**
    This property is set to the proposed drop operation during a call to
    collectionViewValidateDragOperation().  Your delegate implementations can
    change the value of this property to enforce a different type of drop
    operation.

    @type Number
    @default null
  */
  proposedDropOperation: null,

  /** @private
    mouseDragged event handler.  Initiates a drag if the following conditions
    are met:

    - collectionViewShouldBeginDrag() returns YES *OR*
    - the above method is not implemented and canReorderContent is true.
    - the dragDataTypes property returns a non-empty array
    - a mouse down event was saved by the mouseDown method.
  */
  mouseDragged: function (evt) {
    var del     = this.get('selectionDelegate'),
        content = this.get('content'),
        sel     = this.get('selection'),
        info    = this.mouseDownInfo,
        groupIndexes = this.get('_contentGroupIndexes'),
        dragContent, dragDataTypes, dragView;

    // if the mouse down event was cleared, there is nothing to do; return.
    if (!info || info.contentIndex < 0) return YES;

    // Don't do anything unless the user has been dragging for 123msec
    if ((Date.now() - info.at) < 123) return YES;

    // OK, they must be serious, decide if a drag will be allowed.
    if (this.get('isEditable') && del.collectionViewShouldBeginDrag(this)) {

      // First, get the selection to drag.  Drag an array of selected
      // items appearing in this collection, in the order of the
      // collection.
      //
      // Compute the dragContent - the indexes we will be dragging.
      // if we don't select on mouse down, then the selection has not been
      // updated to whatever the user clicked.  Instead use
      // mouse down content.
      if (!this.get("selectOnMouseDown")) {
        dragContent = SC.IndexSet.create(info.contentIndex);
      } else dragContent = sel ? sel.indexSetForSource(content) : null;

      // remove any group indexes.  groups cannot be dragged.
      if (dragContent && groupIndexes && groupIndexes.get('length') > 0) {
        dragContent = dragContent.copy().remove(groupIndexes);
        if (dragContent.get('length') === 0) dragContent = null;
        else dragContent.freeze();
      }

      if (!dragContent) return YES; // nothing to drag
      else dragContent = dragContent.frozenCopy(); // so it doesn't change

      dragContent = { content: content, indexes: dragContent };
      this.set('dragContent', dragContent);

      // Get the set of data types supported by the delegate.  If this returns
      // a null or empty array and reordering content is not also supported
      // then do not start the drag.
      dragDataTypes = this.get('dragDataTypes');
      if (dragDataTypes && dragDataTypes.get('length') > 0) {

        // Build the drag view to use for the ghost drag.  This
        // should essentially contain any visible drag items.
        dragView = del.collectionViewDragViewFor(this, dragContent.indexes);
        if (!dragView) dragView = this._cv_dragViewFor(dragContent.indexes);

        // Initiate the drag
        SC.Drag.start({
          event: info.event,
          source: this,
          dragView: dragView,
          ghost: NO,
          ghostActsLikeCursor: del.ghostActsLikeCursor,
          slideBack: YES,
          dataSource: this
        });

        // Also use this opportunity to clean up since mouseUp won't
        // get called.
        this._cleanupMouseDown();
        this._lastInsertionIndex = null;

      // Drag was not allowed by the delegate, so bail.
      } else this.set('dragContent', null);

      return YES;
    }
  },

  /** @private
    Compute a default drag view by grabbing the raw layers and inserting them
    into a drag view.
  */
  _cv_dragViewFor: function (dragContent) {
    // find only the indexes that are in both dragContent and nowShowing.
    var indexes = this.get('nowShowing').without(dragContent),
        dragLayer = this.get('layer').cloneNode(false),
        view = SC.View.create({ layer: dragLayer, parentView: this }),
        height = 0, layout;

    indexes = this.get('nowShowing').without(indexes);

    // cleanup weird stuff that might make the drag look out of place
    SC.$(dragLayer).css('backgroundColor', 'transparent')
      .css('border', 'none')
      .css('top', 0).css('left', 0);

    indexes.forEach(function (i) {
      var itemView = this.itemViewForContentIndex(i),
          isSelected, layer;

      // render item view without isSelected state.
      if (itemView) {
        isSelected = itemView.get('isSelected');
        itemView.set('isSelected', NO);

        itemView.updateLayerIfNeeded();
        layer = itemView.get('layer');
        if (layer) layer = layer.cloneNode(true);

        itemView.set('isSelected', isSelected);
        itemView.updateLayerIfNeeded();
      }

      if (layer) {
        dragLayer.appendChild(layer);
        layout = itemView.get('layout');
        if (layout.height + layout.top > height) {
          height = layout.height + layout.top;
        }
      }
      layer = null;

    }, this);
    // we don't want to show the scrollbars, resize the dragview'
    view.set('layout', { height: height });

    dragLayer = null;
    return view;
  },


  /**
    Implements the drag data source protocol for the collection view.  This
    property will consult the collection view delegate if one is provided. It
    will also do the right thing if you have set canReorderContent to YES.

    @field
    @type Array
  */
  dragDataTypes: function () {
    // consult delegate.
    var del = this.get('selectionDelegate'),
        ret = del.collectionViewDragDataTypes(this),
        key;

    if (this.get('canReorderContent')) {
      ret = ret ? ret.copy() : [];
      key = this.get('reorderDataType');
      if (ret.indexOf(key) < 0) ret.push(key);
    }

    return ret ? ret : [];
  }.property(),

  /**
    Implements the drag data source protocol method. The implementation of
    this method will consult the collection view delegate if one has been
    provided.  It also respects the canReorderContent method.
  */
  dragDataForType: function (drag, dataType) {

    // if this is a reorder, then return drag content.
    if (this.get('canReorderContent')) {
      if (dataType === this.get('reorderDataType')) {
        return this.get('dragContent');
      }
    }

    // otherwise, just pass along to the delegate
    var del = this.get('selectionDelegate');
    return del.collectionViewDragDataForType(this, drag, dataType);
  },

  /**
    Implements the SC.DropTarget interface.  The default implementation will
    consult the collection view delegate, if you implement those methods.

    This method is called once when the drag enters the view area.  It's
    return value will be stored on the drag object as allowedDragOperations,
    possibly further constrained by the drag source.

    @param {SC.Drag} drag the drag object
    @param {SC.Event} evt the event triggering this change, if available
    @returns {Number} logical OR'd mask of allowed drag operations.
  */
  computeDragOperations: function (drag, evt) {
    // the proposed drag operation is DRAG_REORDER only if we can reorder
    // content and the drag contains reorder content.
    var op  = SC.DRAG_NONE,
        del = this.get('selectionDelegate');

    if (this.get('canReorderContent')) {
      if (drag.get('dataTypes').indexOf(this.get('reorderDataType')) >= 0) {
        op = SC.DRAG_REORDER;
      }
    }

    // Now pass this onto the delegate.
    op = del.collectionViewComputeDragOperations(this, drag, op);
    if (op & SC.DRAG_REORDER) op = SC.DRAG_MOVE;

    return op;
  },

  /** @private
    Determines the allowed drop operation insertion point, operation type,
    and the drag operation to be performed.  Used by dragUpdated() and
    performDragOperation().

    @param {SC.Drag} drag the drag object
    @param {SC.Event} evt source of this request, if available
    @param {Number} dragOp allowed drag operation mask
    Returns three params: [drop index, drop operation, allowed drag ops]
  */
  _computeDropOperationState: function (drag, evt, dragOp) {
    // get the insertion index for this location.  This can be computed
    // by a subclass using whatever method.  This method is not expected to
    // do any data validation, just to map the location to an insertion
    // index.
    var loc    = this.convertFrameFromView(drag.get('location'), null),
        dropOp = SC.DROP_BEFORE,
        del    = this.get('selectionDelegate'),
        canReorder = this.get('canReorderContent'),
        objects, content, isPreviousInDrag, isNextInDrag, len, tmp;

    // STEP 1: Try with a DROP_ON option -- send straight to delegate if
    // supported by view.

    // get the computed insertion index and possibly drop operation.
    // prefer to drop ON.
    var idx = this.insertionIndexForLocation(loc, SC.DROP_ON);
    if (SC.typeOf(idx) === SC.T_ARRAY) {
      dropOp = idx[1]; // order matters here
      idx = idx[0];
    }

    // if the return drop operation is DROP_ON, then just check it with the
    // delegate method.  If the delegate method does not support dropping on,
    // then it will return DRAG_NONE, in which case we will try again with
    // drop before.
    if (dropOp === SC.DROP_ON) {

      // Now save the insertion index and the dropOp.  This may be changed by
      // the collection delegate.
      this.set('proposedInsertionIndex', idx);
      this.set('proposedDropOperation', dropOp);
      tmp = del.collectionViewValidateDragOperation(this, drag, dragOp, idx, dropOp);
      idx = this.get('proposedInsertionIndex');
      dropOp = this.get('proposedDropOperation');
      this._dropInsertionIndex = this._dropOperation = null;

      // The delegate is OK with a drop on also, so just return.
      if (tmp !== SC.DRAG_NONE) return [idx, dropOp, tmp];

      // The delegate is NOT OK with a drop on, try to get the insertion
      // index again, but this time prefer SC.DROP_BEFORE, then let the
      // rest of the method run...
      else {
        dropOp = SC.DROP_BEFORE;
        idx = this.insertionIndexForLocation(loc, SC.DROP_BEFORE);
        if (SC.typeOf(idx) === SC.T_ARRAY) {
          dropOp = idx[1]; // order matters here
          idx = idx[0];
        }
      }
    }

    // if this is a reorder drag, set the proposed op to SC.DRAG_REORDER and
    // validate the insertion point.  This only works if the insertion point
    // is DROP_BEFORE or DROP_AFTER.  DROP_ON is not handled by reordering
    // content.
    if ((idx >= 0) && canReorder && (dropOp !== SC.DROP_ON)) {

      objects = drag.dataForType(this.get('reorderDataType'));
      if (objects) {
        content = this.get('content');

        // if the insertion index is in between two items in the drag itself,
        // then this is not allowed.  Either use the last insertion index or
        // find the first index that is not in between selections.  Stop when
        // we get to the beginning.
        if (dropOp === SC.DROP_BEFORE) {
          isPreviousInDrag = objects.indexes.contains(idx - 1);
          isNextInDrag     = objects.indexes.contains(idx);
        } else {
          isPreviousInDrag = objects.indexes.contains(idx);
          isNextInDrag     = objects.indexes.contains(idx - 1);
        }

        if (isPreviousInDrag && isNextInDrag) {
          if (SC.none(this._lastInsertionIndex)) {
            if (dropOp === SC.DROP_BEFORE) {
              while ((idx >= 0) && objects.indexes.contains(idx)) idx--;
            } else {
              len = content ? content.get('length') : 0;
              while ((idx < len) && objects.indexes.contains(idx)) idx++;
            }
          } else idx = this._lastInsertionIndex;
        }

        // If we found a valid insertion point to reorder at, then set the op
        // to custom DRAG_REORDER.
        if (idx >= 0) dragOp = SC.DRAG_REORDER;
      }
    }

    // Now save the insertion index and the dropOp.  This may be changed by
    // the collection delegate.
    this.set('proposedInsertionIndex', idx);
    this.set('proposedDropOperation', dropOp);
    dragOp = del.collectionViewValidateDragOperation(this, drag, dragOp, idx, dropOp);
    idx = this.get('proposedInsertionIndex');
    dropOp = this.get('proposedDropOperation');
    this._dropInsertionIndex = this._dropOperation = null;

    // return generated state
    return [idx, dropOp, dragOp];
  },

  /**
    Implements the SC.DropTarget interface.  The default implementation will
    determine the drop location and then consult the collection view delegate
    if you implement those methods.  Otherwise it will handle reordering
    content on its own.

    @param {SC.Drag} drag The drag that was updated
    @param {SC.Event} evt The event for the drag
  */
  dragUpdated: function (drag, evt) {
    var op     = drag.get('allowedDragOperations'),
        state  = this._computeDropOperationState(drag, evt, op),
        idx    = state[0], dropOp = state[1], dragOp = state[2];

    // if the insertion index or dropOp have changed, update the insertion
    // point
    if (dragOp !== SC.DRAG_NONE) {
      if ((this._lastInsertionIndex !== idx) || (this._lastDropOperation !== dropOp)) {
        var itemView = this.itemViewForContentIndex(idx);
        this.showInsertionPoint(itemView, dropOp);
      }

      this._lastInsertionIndex = idx;
      this._lastDropOperation = dropOp;
    } else {
      this.hideInsertionPoint();
      this._lastInsertionIndex = this._lastDropOperation = null;
    }

    // Normalize drag operation to the standard kinds accepted by the drag
    // system.
    return (dragOp & SC.DRAG_REORDER) ? SC.DRAG_MOVE : dragOp;
  },

  /**
    Implements the SC.DropTarget protocol.  Hides any visible insertion
    point and clears some cached values.
  */
  dragEnded: function () {
    this.hideInsertionPoint();
    this._lastInsertionIndex = this._lastDropOperation = null;
  },

  /**
    Implements the SC.DropTarget protocol.

    @returns {Boolean} YES
  */
  acceptDragOperation: function (drag, op) {
    return YES;
  },

  /**
    Implements the SC.DropTarget protocol. Consults the collection view
    delegate to actually perform the operation unless the operation is
    reordering content.

    @param {SC.Drag} drag The drag to perform the operation on
    @param {Number} op The drag operation to perform
    @return {Number} The operation performed
  */
  performDragOperation: function (drag, op) {
    // Get the correct insertion point, drop operation, etc.
    var state = this._computeDropOperationState(drag, null, op),
        idx   = state[0], dropOp = state[1], dragOp = state[2],
        del   = this.get('selectionDelegate'),
        performed, objects, data, content, shift, indexes;

    // The dragOp is the kinds of ops allowed.  The drag operation must
    // be included in that set.
    if (dragOp & SC.DRAG_REORDER) {
      op = (op & SC.DRAG_MOVE) ? SC.DRAG_REORDER : SC.DRAG_NONE;
    } else op = op & dragOp;

    // If no allowed drag operation could be found, just return.
    if (op === SC.DRAG_NONE) return op;

    // Some operation is allowed through, give the delegate a chance to
    // handle it.
    performed = del.collectionViewPerformDragOperation(this, drag, op, idx, dropOp);

    // If the delegate did not handle the drag (i.e. returned SC.DRAG_NONE),
    // and the op type is REORDER, then do the reorder here.
    if ((performed === SC.DRAG_NONE) && (op & SC.DRAG_REORDER)) {

      data = drag.dataForType(this.get('reorderDataType'));
      if (!data) return SC.DRAG_NONE;

      content = this.get('content');

      // check for special case - inserting BEFORE ourself...
      // in this case just pretend the move happened since it's a no-op
      // anyway
      indexes = data.indexes;
      if (indexes.get('length') === 1) {
        if (((dropOp === SC.DROP_BEFORE) || (dropOp === SC.DROP_AFTER)) &&
            (indexes.get('min') === idx)) return SC.DRAG_MOVE;
      }

      content.beginPropertyChanges(); // suspend notifications

      // get each object, then remove it from the content. they will be
      // added again later.
      objects = [];
      shift = 0;
      data.indexes.forEach(function (i) {
        objects.push(content.objectAt(i - shift));
        content.removeAt(i - shift);
        shift++;
        if (i < idx) idx--;
      }, this);

      // now insert objects into new insertion location
      if (dropOp === SC.DROP_AFTER) idx++;
      content.replace(idx, 0, objects, dropOp);
      this.select(SC.IndexSet.create(idx, objects.length));
      content.endPropertyChanges(); // restart notifications

      // make the op into its actual value
      op = SC.DRAG_MOVE;
    }

    return op;
  },

  /**
    Default delegate method implementation, returns YES if canReorderContent
    is also true.

    @param {SC.View} view
  */
  collectionViewShouldBeginDrag: function (view) {
    return this.get('canReorderContent');
  },


  // ..........................................................
  // INSERTION POINT
  //


  /**
    Get the preferred insertion point for the given location, including
    an insertion preference of before, after or on the named index.

    You can implement this method in a subclass if you like to perform a
    more efficient check.  The default implementation will loop through the
    item views looking for the first view to "switch sides" in the orientation
    you specify.

    This method should return an array with two values.  The first value is
    the insertion point index and the second value is the drop operation,
    which should be one of SC.DROP_BEFORE, SC.DROP_AFTER, or SC.DROP_ON.

    The preferred drop operation passed in should be used as a hint as to
    the type of operation the view would prefer to receive. If the
    dropOperation is SC.DROP_ON, then you should return a DROP_ON mode if
    possible.  Otherwise, you should never return DROP_ON.

    For compatibility, you can also return just the insertion index.  If you
    do this, then the collection view will assume the drop operation is
    SC.DROP_BEFORE.

    If an insertion is NOT allowed, you should return -1 as the insertion
    point.  In this case, the drop operation will be ignored.

    @param {Point} loc the mouse location.
    @param {DropOp} dropOperation the preferred drop operation.
    @returns {Array} format: [index, op]
  */
  insertionIndexForLocation: function (loc, dropOperation) {
    return -1;
  },

  // ..........................................................
  // SCROLLING
  //

  /** @private SC.ScrollView */
  touchScrollDidStart: function () {
    var clippingFrame = this.get('clippingFrame');

    // Create the in-scroll clipping frame that will be used while touch scrolling.
    this._inScrollClippingFrame = {
      x: clippingFrame.x,
      y: clippingFrame.y,
      width: clippingFrame.width,
      height: clippingFrame.height
    };
  },

  /* @private Internal property used to track the rate of touch scroll change events. */
  _lastTouchScrollTime: null,

  /** @private SC.ScrollView */
  touchScrollDidChange: function (left, top) {
    // Fast path!  Don't try to update too soon.
    if (Date.now() - this._lastTouchScrollTime < 30) { return; }

    var inScrollClippingFrame = this._inScrollClippingFrame;

    // Update the in-scroll clipping frame with the new values.
    inScrollClippingFrame.x = left;
    inScrollClippingFrame.y = top;

    // Indicate that nowShowing should be re-computed (this will use the
    // in-scroll clipping frame when it does).
    // TODO: perform a raw update that doesn't require the run loop.
    SC.run(function () {
    this.notifyPropertyChange('nowShowing');
    this.invokeOnce('_cv_nowShowingDidChange');
    }, this);

    // Track the last time we updated.
    this._lastTouchScrollTime = Date.now();
  },

  /** @private SC.ScrollView */
  touchScrollDidEnd: function () {
    // Clean up so that the regular clippingFrame is used again.
    this._inScrollClippingFrame = null;
  },

  // ..........................................................
  // INTERNAL SUPPORT
  //

  /** @private - when we are about to become visible, reload if needed. */
  willShowInDocument: function () {
    if (this._invalidIndexes) this.invokeOnce(this.reloadIfNeeded);
    if (this._invalidSelection) {
      this.invokeOnce(this.reloadSelectionIndexesIfNeeded);
    }
  },

  /** @private - when we are added, reload if needed. */
  didAppendToDocument: function () {
    if (this._invalidIndexes) this.invokeOnce(this.reloadIfNeeded);
    if (this._invalidSelection) {
      this.invokeOnce(this.reloadSelectionIndexesIfNeeded);
    }
  },

  /**
    Default delegate method implementation, returns YES if isSelectable
    is also true.
  */
  collectionViewShouldSelectItem: function (view, item) {
    return this.get('isSelectable');
  },

  /** @private */
  _TMP_DIFF1: SC.IndexSet.create(),

  /** @private */
  _TMP_DIFF2: SC.IndexSet.create(),

  /** @private

    Whenever the nowShowing range changes, update the range observer on the
    content item and instruct the view to reload any indexes that are not in
    the previous nowShowing range.

  */
  _cv_nowShowingDidChange: function () {
    var nowShowing  = this.get('nowShowing'),
        last        = this._sccv_lastNowShowing,
        diff, diff1, diff2;

    // find the differences between the two
    // NOTE: reuse a TMP IndexSet object to avoid creating lots of objects
    // during scrolling
    if (last !== nowShowing) {
      if (last && nowShowing) {
        diff1 = this._TMP_DIFF1.add(last).remove(nowShowing);
        diff2 = this._TMP_DIFF2.add(nowShowing).remove(last);
        diff = diff1.add(diff2);
      } else diff = last || nowShowing;
    }

    // if nowShowing has actually changed, then update
    if (diff && diff.get('length') > 0) {
      this._sccv_lastNowShowing = nowShowing ? nowShowing.frozenCopy() : null;
      this.updateContentRangeObserver();
      this.reload(diff);
    }

    // cleanup tmp objects
    if (diff1) diff1.clear();
    if (diff2) diff2.clear();

  }.observes('nowShowing'),

  /** @private */
  init: function () {
    arguments.callee.base.apply(this,arguments);

    if (this.useFastPath) {
      
      // Deprecation warning for those that were using SC.CollectionFastPath.
      SC.warn("Developer Warning: SC.CollectionView `useFastPath` has been deprecated.  The performance improvements have been integrated directly into SC.CollectionView as the default behavior.  Please disable the useFastPath property and refer to the SC.CollectionView documentation for more information.");
      
      this.mixin(SC.CollectionFastPath);
    }

    
    if (this.willReload || this.didReload) {
      // Deprecation warning for willReload and didReload.  These don't seem to serve any purpose.
      SC.warn("Developer Warning: SC.CollectionView no longer calls willReload and didReload on its subclasses because it includes item view and layer pooling in itself by default.");
    }
    

    if (this.get('canReorderContent')) this._cv_canReorderContentDidChange();
    this._sccv_lastNowShowing = this.get('nowShowing').clone();

    if (this.content) this._cv_contentDidChange();
    if (this.selection) this._cv_selectionDidChange();
  },

  /** @private
    Become a drop target whenever reordering content is enabled.
  */
  _cv_canReorderContentDidChange: function () {
    if (this.get('canReorderContent')) {
      if (!this.get('isDropTarget')) this.set('isDropTarget', YES);
      SC.Drag.addDropTarget(this);
    }
  }.observes('canReorderContent'),

  /** @private
    Fires an action after a selection if enabled.

    if actOnSelect is YES, then try to invoke the action, passing the
    current selection (saved as a separate array so that a change in sel
    in the meantime will not be lost)
  */
  _cv_performSelectAction: function (view, ev, delay, clickCount) {
    var sel;
    if (delay === undefined) delay = 0;
    if (clickCount === undefined) clickCount = 1;
    if ((clickCount > 1) || this.get('actOnSelect')) {
      if (this._cv_reselectTimer) this._cv_reselectTimer.invalidate();
      sel = this.get('selection');
      sel = sel ? sel.toArray() : [];
      if (this._cv_actionTimer) this._cv_actionTimer.invalidate();
      this._cv_actionTimer = this.invokeLater(this._cv_action, delay, view, ev, sel);
    }
  },

  /** @private
    Perform the action.  Supports legacy behavior as well as newer style
    action dispatch.
  */
  _cv_action: function (view, evt, context) {
    var action = this.get('action');
    var target = this.get('target') || null;

    this._cv_actionTimer = null;
    if (action) {
      // if the action is a function, just call it
      if (SC.typeOf(action) === SC.T_FUNCTION) return this.action(view, evt);

      // otherwise, use the new sendAction style
      var pane = this.get('pane');
      if (pane) {
        pane.rootResponder.sendAction(action, target, this, pane, context);
      }

    // if no action is specified, then trigger the support action,
    // if supported.
    } else if (!view) {
      return; // nothing to do

    // if the target view has its own internal action handler,
    // trigger that.
    } else if (SC.typeOf(view._action) == SC.T_FUNCTION) {
      return view._action(evt);

    // otherwise call the action method to support older styles.
    } else if (SC.typeOf(view.action) == SC.T_FUNCTION) {
      return view.action(evt);
    }
  },

  _attrsForContentIndex: function (idx) {
    var attrs = this._TMP_ATTRS,
      del = this.get('contentDelegate'),
      items = this.get('content'),
      isGroupView = this._contentIndexIsGroup(idx),
      isEditable = this.get('isEditable') && this.get('canEditContent'),
      isReorderable = this.get('isEditable') && this.get('canReorderContent'),
      isDeletable = this.get('isEditable') && this.get('canDeleteContent'),
      isEnabled = del.contentIndexIsEnabled(this, items, idx),
      isSelected = del.contentIndexIsSelected(this, items, idx),
      outlineLevel = del.contentIndexOutlineLevel(this, items, idx),
      disclosureState = del.contentIndexDisclosureState(this, items, idx);

    attrs.contentIndex = idx;
    attrs.content = items.objectAt(idx);
    attrs.disclosureState = disclosureState;
    attrs.isEnabled = isEnabled;
    attrs.isEditable = isEditable;
    attrs.isReorderable = isReorderable;
    attrs.isDeletable = isDeletable;
    attrs.isSelected = isSelected;
    attrs.isGroupView = isGroupView;
    attrs.layerId = this.layerIdFor(idx);
    attrs.owner = attrs.displayDelegate = this;
    attrs.page = this.page;
    attrs.outlineLevel = outlineLevel;

    if (isGroupView) attrs.classNames = this._GROUP_COLLECTION_CLASS_NAMES;
    else attrs.classNames = this._COLLECTION_CLASS_NAMES;

    attrs.layout = this.layoutForContentIndex(idx);
    if (!attrs.layout) { attrs.layout = SC.View.prototype.layout; }

    return attrs;
  },

  /** @private
    A cache of the `contentGroupIndexes` value returned by the delegate.  This
    is frequently accessed and usually involves creating an `SC.IndexSet`
    object, so it's worthwhile to cache.
  */
  _contentGroupIndexes: function () {
    return this.get('contentDelegate').contentGroupIndexes(this, this.get('content'));
  }.property('contentDelegate').cacheable(),

  /** @private
    Rather than calling contentIndexIsGroup on the delegate each time, first
    check if there are even any contentGroupIndexes.
  */
  _contentIndexIsGroup: function (idx) {
    var groupIndexes = this.get('_contentGroupIndexes');

    // If there are groupIndexes and the given index is within them, check
    // with the delegate.
    if (groupIndexes && groupIndexes.contains(idx)) {
      var del = this.get('contentDelegate'),
        items = this.get('content');

      return del.contentIndexIsGroup(this, items, idx);
    } else {
      return false;
    }
  },

  /** @private
    Determines the example view for a content index.
  */
  _exampleViewForContentIndex: function (idx) {
    var key,
      ExampleView,
      items = this.get('content'),
      item = items.objectAt(idx);

    if (this._contentIndexIsGroup(idx)) {
      // so, if it is indeed a group view, we go that route to get the example view
      key = this.get('contentGroupExampleViewKey');
      if (key && item) ExampleView = item.get(key);
      if (!ExampleView) ExampleView = this.get('groupExampleView') || this.get('exampleView');
    } else {
      // otherwise, we go through the normal example view
      key = this.get('contentExampleViewKey');
      if (key && item) ExampleView = item.get(key);
      if (!ExampleView) ExampleView = this.get('exampleView');
    }

    return ExampleView;
  },

  /** @private
    Returns the pool for a given example view.

    The pool is calculated based on the guid for the example view class.

    @param {SC.View} exampleView
  */
  _poolForExampleView: function (exampleView) {
    var poolKey = SC.guidFor(exampleView);
    if (!this._pools) { this._pools = {}; }
    if (!this._pools[poolKey]) this._pools[poolKey] = [];
    return this._pools[poolKey];
  },

  /** @private
    Override to compute the hidden layout of the itemView for the content at the
    specified idnex.  This layout will be applied when it is moved to the
    pool for reuse and should be completely outside the visible portion
    of the collection.

    By default this layout is determined using the normal layout for the item.
    If the regular layout has a height, the pooled layout will be one height
    off the top (for top positioned) or off the bottom (for bottom positioned)
    and if the regular layout has a width, the pooled layout will be one
    width off the left (for left positioned) or off the right (for right
    positioned).

    @param Number contentIndex the index of the item in the content
    @returns Object a view layout
  */
  _poolLayoutForContentIndex: function (contentIndex) {
    var layout = this.layoutForContentIndex(contentIndex);

    if (layout && layout.height) {
      if (layout.top) { layout.top = -layout.height; }
      else { layout.bottom = -layout.height; }
    } else if (layout && layout.width) {
      if (layout.left) { layout.left = -layout.width; }
      else { layout.right = -layout.width; }
    } else {
      // There is not really a valid layout for a collection.  Just shape it and
      // place it out of view.
      layout = { left: -100, width: 100, top: -100, height: 100 };
    }

    return layout;
  },

  /** @private
    Configures an existing item view with new attributes.

    @param {SC.View} itemView
    @param {Hash} attrs
  */
  _reconfigureItemView: function (itemView, attrs) {
    itemView.beginPropertyChanges();
    itemView.set('content', attrs.content);
    itemView.set('contentIndex', attrs.contentIndex);
    itemView.set('isEnabled', attrs.isEnabled);
    itemView.set('isEditable', attrs.isEditable);
    itemView.set('isReorderable', attrs.isReorderable);
    itemView.set('isDeletable', attrs.isDeletable);
    itemView.set('isSelected', attrs.isSelected);
    itemView.set('layerId', attrs.layerId);
    itemView.set('layout', attrs.layout);
    itemView.set('outlineLevel', attrs.outlineLevel);
    itemView.set('disclosureState', attrs.disclosureState);
    itemView.endPropertyChanges();
  },

  /** @private
    Removes the item view, pooling it for re-use if possible.
  */
  _removeItemView: function (itemView, idx) {
    var exampleView,
      items = this.get('content'),
      layout,
      pool,
      prototype,
      wasPooled = false;

    // Don't pool views whose content has changed, because if the example
    // view used is different than the new content, we would pool the wrong
    // type of view.
    if (items && itemView.get('content') === items.objectAt(idx)) {

      exampleView = this._exampleViewForContentIndex(idx);
      if (SC.none(exampleView.prototype.isReusable) || exampleView.prototype.isReusable) {
        // If the exampleView is reusable, send the view to its pool.
        pool = this._poolForExampleView(exampleView);

        
        // Add a bit of developer support if they are migrating over from SC.CollectionFastPath
        if (itemView.hibernateInPool) {
          SC.error("Developer Error: Item views that want to do clean up before being pooled should implement sleepInPool not hibernateInPool.  This will be temporarily fixed up for development mode only, but must be changed before production.");
          itemView.sleepInPool = itemView.hibernateInPool;
        }
        

        // Give the view a chance to do some clean up before sleeping.
        if (itemView.sleepInPool) { itemView.sleepInPool(this); }

        pool.push(itemView);

        // If the exampleView's layer isn't reusable, destroy it.
        prototype = exampleView.prototype;
        if (!SC.none(prototype.isLayerReusable) && !prototype.isLayerReusable) {
          itemView.destroyLayer();
        } else {
          // If the layer is sticking around, be sure to move it out of view.
          layout = this._poolLayoutForContentIndex(idx);
          itemView.set('layout', layout);
        }

        // Ensure that the id of views in the pool don't clash with ids that
        // are used outside of it.
        itemView.set('layerId', SC.generateGuid(null, 'pool-'));

        wasPooled = true;
      }
    }

    if (!wasPooled) {
      itemView.destroy();
    }

    // Remove the cached view (can still exist in the pool)
    delete this._sc_itemViews[idx];
  }


});

/* >>>>>>>>>> BEGIN source/views/date_field.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals Shared */

/** @class

  A Date field add behaviour to the Text Field to support date management,
  for example, disabling deletion, and special behaviour to tabs commands.

  This field view is tightly integrated with SC.DateTime

  By default the Date Field View show Date only, but if you need to show the Time do:

      dateAndTime: Shared.DateFieldView.design({
        showTime: YES,
        valueBinding: '...'
      }),

  and if you only need to show time:

      timeOnly: Shared.DateFieldView.design({
        showTime: YES,
        showDate: NO,
        valueBinding: '...'
      })

  Example usage with special format:

      specialDate: Shared.DateFieldView.design({
        formatDate: '%d %b of %Y',
        valueBinding: '...'
      }),

  You can override these format as you like, but has some limitations,
  actually only support these KEY from SC.DateTime:

  %a %b %d %H %I %j %m %M %p %S %U %W %y %Y

  These are keys that has FIXED length, so we can control the selection and tabing.

  @extends SC.TextFieldView
  @since SproutCore 1.0
  @author Juan Pablo Goldfinger
*/
SC.DateFieldView = SC.TextFieldView.extend(
/** @scope SC.DateFieldView.prototype */ {

  /**
    @type String
    @default null
  */
  value: null,

  /**
    @type Boolean
    @default YES
  */
  showDate: YES,

  /**
    @type Boolean
    @default NO
  */
  showTime: NO,

  /**
    @type String
    @default '%I:%M %p'
  */
  formatTime: '%I:%M %p',

  /**
    @type String
    @default '%d/%m/%Y'
  */
  formatDate: '%d/%m/%Y',

  /**
    @type String
    @default '%d/%m/%Y %I:%M %p'
  */
  formatDateTime: '%d/%m/%Y %I:%M %p',

  // DateTime constants (with fixed width, like numbers or abbs with fixed length)
  // original: '%a %A %b %B %c %d %h %H %i %I %j %m %M %p %S %U %W %x %X %y %Y %Z %%'.w(),
  // NOTE: I think that %a and %b aren't useful because is more adequate to represent day
  // with 1..31 without zeros at start, but causes the length not to be fixed)

  /** @private*/
  _dtConstants: ['%a', '%b', '%d', '%H', '%I', '%j', '%m', '%M', '%p', '%S', '%U', '%W', '%y', '%Y'],
  // Width constants for each representation %@.

  /** @private */
  _wtConstants: [3,3,2,2,2,3,2,2,2,2,2,2,2,4],

  /** @private */
  activeSelection: 0,

  /*
  FUTURE: DatePickerSupport.
  createChildViews: function() {
    arguments.callee.base.apply(this,arguments);
    if (SC.browser.isWebkit) {
      // ON MOZILLA DON'T WORK
      var view = Shared.DatePickerView.extend({
        layout: { right: 0, centerY: 0, width: 18, height: 15 }
      });
      view.bind('value', [this, 'value']);
      view.bind('isVisible', [this, 'isEnabled']);
      this.set('rightAccessoryView', view);
    }
  },
  */

  /**
    The current format to apply for Validator and to show.

    @field
    @type String
    @observes showTime
    @observes showDate
  */
  format: function() {
    var st = this.get('showTime');
    var sd = this.get('showDate');
    if (st === YES && sd === YES) return this.get('formatDateTime');
    if (st === YES) return this.get('formatTime');
    return this.get('formatDate');
  }.property('showTime', 'showDate').cacheable(),

  /**
    The current validator to format the Date to the input field and vice versa.

    @field
    @type SC.Validator.DateTime
    @observes format
  */
  validator: function() {
    return SC.Validator.DateTime.extend({ format: this.get('format') });
  }.property('format').cacheable(),

  /**
    Array of Key/TextSelection found for the current format.

    @field
    @type SC.Array
  */
  tabsSelections: function() {
    var arr = [];
    var ft = this.get('format');
    var _dt = this.get('_dtConstants');
    var _wt = this.get('_wtConstants');

    // Parse the string format to retrieve and build
    // a TextSelection array ordered to support tabs behaviour
    if (SC.empty(ft)) {
      throw new Error('The format string is empty, and must be a valid string.');
    }

    var pPos, key, keyPos, startAt = 0, nPos = 0, oPos = 0;
    while(startAt < ft.length && ft.indexOf('%', startAt) !== -1) {
      pPos = ft.indexOf('%', startAt);
      key = ft.substring(pPos, pPos + 2);
      startAt = pPos + 2;

      keyPos = _dt.indexOf(key);
      if (keyPos === -1) {
        throw new Error("SC.DateFieldView: The format's key '%@' is not supported.".fmt(key));
      }
      nPos = nPos + pPos - oPos;
      arr.push(SC.Object.create({
        key: key,
        textSelection: SC.TextSelection.create({ start: nPos, end: nPos + _wt[keyPos] })
      }));
      nPos = nPos + _wt[keyPos];
      oPos = startAt;
    }
    pPos = key = keyPos = null;

    return arr;
  }.property('format').cacheable(),

  /** @private
    If the activeSelection changes or the value changes, update the "TextSelection" to show accordingly.
  */
  updateTextSelectionObserver: function() {
    var as = this.get('activeSelection');
    var ts = this.get('tabsSelections');
    if (this.get('isEditing')) {
      this.selection(null, ts[as].get('textSelection'));
    }
  }.observes('activeSelection', 'value'),

  /** @private
    Updates the value according the key.
  */
  updateValue: function(key, upOrDown) {
    // 0 is DOWN - 1 is UP
    var newValue = (upOrDown === 0) ? -1 : 1;
    var value = this.get('value'), hour;
    switch(key) {
      case '%a': case '%d': case '%j': this.set('value', value.advance({ day: newValue })); break;
      case '%b': case '%m': this.set('value', value.advance({ month: newValue })); break;
      case '%H': case '%I': this.set('value', value.advance({ hour: newValue })); break;
      case '%M': this.set('value', value.advance({ minute: newValue })); break;
      case '%p': {
        hour = value.get('hour') >= 12 ? -12 : 12;
        this.set('value', value.advance({ hour: hour }));
        break;
      }
      case '%S': this.set('value', value.advance({ second: newValue })); break;
      case '%U': this.set('value', value.advance({ week1: newValue })); break;
      case '%W': this.set('value', value.advance({ week0: newValue })); break;
      case '%y': case '%Y': this.set('value', value.advance({ year: newValue })); break;
    }
  },

  _selectRootElement: function() {
    // TODO: This is a solution while I don't found how we
    // receive the last key from the last input.
    // (to see if is entering with Tab or backTab)
    /*if (this.get('activeSelection') === -1) {
    }*/
  },


  // ..........................................................
  // Key Event Support
  //

  /** @private */
  keyDown: function(evt) {
    if (this.interpretKeyEvents(evt)) {
      evt.stop();
      return YES;
    }
    return arguments.callee.base.apply(this,arguments);
  },

  /** @private */
  ctrl_a: function() {
    return YES;
  },

  /** @private */
  moveUp: function(evt) {
    var as = this.get('activeSelection');
    var ts = this.get('tabsSelections');
    this.updateValue(ts[as].get('key'), 1);
    return YES;
  },

  /** @private */
  moveDown: function(evt) {
    var as = this.get('activeSelection');
    var ts = this.get('tabsSelections');
    this.updateValue(ts[as].get('key'), 0);
    return YES;
  },

  /** @private */
  insertText: function(evt) {
    return YES;
  },

  /** @private */
  moveRight: function(evt) {
    var ts = this.get('tabsSelections');
    var ns = this.get('activeSelection') + 1;
    if (ns === ts.length) {
      ns = 0;
    }
    this.set('activeSelection', ns);
    return YES;
  },

  /** @private */
  moveLeft: function(evt) {
    var ts = this.get('tabsSelections');
    var ns = this.get('activeSelection') - 1;
    if (ns === -1) {
      ns = ts.length - 1;
    }
    this.set('activeSelection', ns);
    return YES;
  },

  /** @private */
  insertTab: function(evt) {
    var ts = this.get('tabsSelections');
    var ns = this.get('activeSelection') + 1;
    if (ns < ts.length) {
      this.set('activeSelection', ns);
      return YES;
    }
    return NO;
  },

  /** @private */
  insertBacktab: function(evt) {
    var ns = this.get('activeSelection') - 1;
    if (ns !== -1) {
      this.set('activeSelection', ns);
      return YES;
    }
    return NO;
  },

  /** @private */
  mouseUp: function(evt) {
    var ret = arguments.callee.base.apply(this,arguments);
    var cs = this.get('selection');
    if (SC.none(cs)) {
      this.set('activeSelection', 0);
    } else {
      var caret = cs.get('start');
      var ts = this.get('tabsSelections');
      var _tsLen = ts.length, cts;
      for(var i=0; i<_tsLen; i++) {
        cts = ts[i].get('textSelection');
        if (caret >= cts.get('start') && caret <= cts.get('end')) {
          this.set('activeSelection', i);
        }
      }
    }
    return ret;
  },

  /** @private */
  deleteBackward: function(evt) {
    return YES;
  },

  /** @private */
  deleteForward: function(evt) {
    return YES;
  }

});

/* >>>>>>>>>> BEGIN source/views/disclosure.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/**
  @class
  
  Disclosure triangle button. As a subclass of SC.ButtonView, this view
  takes a lot of the same properties as a button:
  
    - isEnabled: whether disclosure triangle is clickable or not
    - value: `YES` or `NO` (where `YES` implies expanded/open)
  
  A disclosure view also supports expanding and collapsing via
  the keyboard.
  
  @extends SC.ButtonView
  @since SproutCore 1.0
*/
SC.DisclosureView = SC.ButtonView.extend(
/** @scope SC.DisclosureView.prototype */ {
  
  /**
    @type Array
    @default ['sc-disclosure-view']
    @see SC.View#classNames
  */
  classNames: ['sc-disclosure-view'],

  /**
    @type String
    @default 'disclosureRenderDelegate'
  */
  renderDelegateName: 'disclosureRenderDelegate',

  /**
    @type String
    @default SC.TOGGLE_BEHAVIOR
    @see SC.ButtonView#buttonBehavior
  */
  buttonBehavior: SC.TOGGLE_BEHAVIOR,
  
  /**
    This is the value that will be set when the disclosure triangle is toggled
    open.
    
    @type Boolean
    @default YES
  */
  toggleOnValue: YES,
  
  /**
    The value that will be set when the disclosure triangle is toggled closed.
    
    @type Boolean
    @default YES
  */
  toggleOffValue: NO,
  
  /** @private */
  valueBindingDefault: SC.Binding.bool(),

  /** @private

    Allows toggling of the value with the right and left arrow keys.
    Extends the behavior inherited from SC.ButtonView.
    @param evt
  */
  keyDown: function(evt) {
    if (evt.which === 37 || evt.which === 38) {
      this.set('value', this.get('toggleOffValue')) ;
      return YES;
    }

    if (evt.which === 39 || evt.which === 40) {
      this.set('value', this.get('toggleOnValue')) ;
      return YES;
    }
    arguments.callee.base.apply(this,arguments);
  }

});

/* >>>>>>>>>> BEGIN source/views/list.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('views/collection');
sc_require('mixins/collection_row_delegate');

/** @class

  A list view renders vertical lists of items.  It is a specialized form of
  collection view that is simpler than the table view, but more refined than
  a generic collection.

  You can use a list view just like a collection view, except that often you
  also should provide a default rowHeight.  Setting this value will allow
  the ListView to optimize its rendering.

  ## Variable Row Heights

  Normally you set the row height through the rowHeight property.  You can
  also support custom row heights by implementing the
  contentCustomRowHeightIndexes property to return an index set.

  ## Using ListView with Very Large Data Sets

  ListView implements incremental rendering, which means it will only render
  HTML for the items that are current visible on the screen.  You can use it
  to efficiently render lists with 100K+ items very efficiently.

  If you need to work with very large lists of items, however, be aware that
  calculate variable rows heights can become very expensive since the list
  view will essentially have to iterate over every item in the collection to
  collect its row height.

  To work with very large lists, you should consider making your row heights
  uniform.  This will allow the list view to efficiently render content
  without worrying about the overall performance.

  Alternatively, you may want to consider overriding the
  offsetForRowAtContentIndex() and heightForRowAtContentIndex() methods to
  perform some faster calculations that do not require inspecting every
  item in the collection.

  Note that row heights and offsets are cached so once they are calculated
  the list view will be able to display very quickly.

  ## Dropping on an Item

  When the list view is configured to accept drags and drops onto its items, it
  will set the isDropTarget property on the target item accordingly.  This
  allows you to modify the appearance of the drop target list item accordingly
  (@see SC.ListItemView#isDropTarget).

  @extends SC.CollectionView
  @extends SC.CollectionRowDelegate
  @since SproutCore 1.0
*/
// (Can we also have an 'estimate row heights' property that will simply
// cheat for very long data sets to make rendering more efficient?)
SC.ListView = SC.CollectionView.extend(SC.CollectionRowDelegate,
/** @scope SC.ListView.prototype */ {

  /**
    @type Array
    @default ['sc-list-view']
    @see SC.View#classNames
  */
  classNames: ['sc-list-view'],

  /**
    @type Boolean
    @default YES
  */
  acceptsFirstResponder: YES,

  /** @private SC.CollectionView.prototype */
  exampleView: SC.ListItemView,

  /**
    If set to YES, the default theme will show alternating rows
    for the views this ListView created through exampleView property.

    @type Boolean
    @default NO
  */
  showAlternatingRows: NO,


  // ..........................................................
  // METHODS
  //

  /** @private */
  render: function(context, firstTime) {
    context.setClass('alternating', this.get('showAlternatingRows'));

    return arguments.callee.base.apply(this,arguments);
  },


  // ..........................................................
  // COLLECTION ROW DELEGATE SUPPORT
  //

  /**
    @field
    @type Object
    @observes 'delegate'
    @observes 'content'
  */
  rowDelegate: function() {
    var del = this.delegate,
        content = this.get('content');

    return this.delegateFor('isCollectionRowDelegate', del, content);
  }.property('delegate', 'content').cacheable(),

  /** @private
    Whenever the rowDelegate changes, begin observing important properties
  */
  _sclv_rowDelegateDidChange: function() {
    var last = this._sclv_rowDelegate,
        del  = this.get('rowDelegate'),
        func = this._sclv_rowHeightDidChange,
        func2 = this._sclv_customRowHeightIndexesDidChange;

    if (last === del) return this; // nothing to do
    this._sclv_rowDelegate = del;

    // last may be null on a new object
    if (last) {
      last.removeObserver('rowHeight', this, func);
      last.removeObserver('customRowHeightIndexes', this, func2);
    }

    if (!del) {
      throw new Error("Internal Inconsistancy: ListView must always have CollectionRowDelegate");
    }

    del.addObserver('rowHeight', this, func);
    del.addObserver('customRowHeightIndexes', this, func2);
    this._sclv_rowHeightDidChange()._sclv_customRowHeightIndexesDidChange();
    return this ;
  }.observes('rowDelegate'),

  /** @private
    called whenever the rowHeight changes.  If the property actually changed
    then invalidate all row heights.
  */
  _sclv_rowHeightDidChange: function() {
    var del = this.get('rowDelegate'),
        height = del.get('rowHeight'),
        indexes;

    if (height === this._sclv_rowHeight) return this; // nothing to do
    this._sclv_rowHeight = height;

    indexes = SC.IndexSet.create(0, this.get('length'));
    this.rowHeightDidChangeForIndexes(indexes);
    return this ;
  },

  /** @private
    called whenever the customRowHeightIndexes changes.  If the property
    actually changed then invalidate affected row heights.
  */
  _sclv_customRowHeightIndexesDidChange: function() {
    var del     = this.get('rowDelegate'),
        indexes = del.get('customRowHeightIndexes'),
        last    = this._sclv_customRowHeightIndexes,
        func    = this._sclv_customRowHeightIndexesContentDidChange;

    // nothing to do
    if ((indexes===last) || (last && last.isEqual(indexes))) return this;

    // if we were observing the last index set, then remove observer
    if (last && this._sclv_isObservingCustomRowHeightIndexes) {
      last.removeObserver('[]', this, func);
    }

    // only observe new index set if it exists and it is not frozen.
    if (this._sclv_isObservingCustomRowHeightIndexes = indexes && !indexes.get('isFrozen')) {
      indexes.addObserver('[]', this, func);
    }

    this._sclv_customRowHeightIndexesContentDidChange();
    return this ;
  },

  /** @private
    Called whenever the customRowHeightIndexes set is modified.
  */
  _sclv_customRowHeightIndexesContentDidChange: function() {
    var del     = this.get('rowDelegate'),
        indexes = del.get('customRowHeightIndexes'),
        last    = this._sclv_customRowHeightIndexes,
        changed;

    // compute the set to invalidate.  the union of cur and last set
    if (indexes && last) {
      changed = indexes.copy().add(last);
    } else changed = indexes || last ;
    this._sclv_customRowHeightIndexes = indexes ? indexes.frozenCopy() : null;

    // invalidate
    this.rowHeightDidChangeForIndexes(changed);
    return this ;
  },


  // ..........................................................
  // ROW PROPERTIES
  //

  /**
    Returns the top offset for the specified content index.  This will take
    into account any custom row heights and group views.

    @param {Number} idx the content index
    @returns {Number} the row offset
  */
  rowOffsetForContentIndex: function(idx) {
    if (idx === 0) return 0 ; // fastpath

    var del       = this.get('rowDelegate'),
        rowHeight = del.get('rowHeight'),
        rowSpacing, ret, custom, cache, delta, max, content ;

    ret = idx * rowHeight;

    rowSpacing = this.get('rowSpacing');
		if(rowSpacing){
      ret += idx * rowSpacing;
    }

    if (del.customRowHeightIndexes && (custom=del.get('customRowHeightIndexes'))) {

      // prefill the cache with custom rows.
      cache = this._sclv_offsetCache;
      if (!cache) {
        cache = [];
        delta = max = 0 ;
        custom.forEach(function(idx) {
          delta += this.rowHeightForContentIndex(idx)-rowHeight;
          cache[idx+1] = delta;
          max = idx ;
        }, this);
        this._sclv_max = max+1;
        // moved down so that the cache is not marked as initialized until it actually is
        this._sclv_offsetCache = cache;
      }

      // now just get the delta for the last custom row before the current
      // idx.
      delta = cache[idx];
      if (delta === undefined) {
        delta = cache[idx] = cache[idx-1];
        if (delta === undefined) {
          max = this._sclv_max;
          if (idx < max) max = custom.indexBefore(idx)+1;
          delta = cache[idx] = cache[max] || 0;
        }
      }

      ret += delta ;
    }

    return ret ;
  },

  /**
    Returns the row height for the specified content index.  This will take
    into account custom row heights and group rows.

    @param {Number} idx content index
    @returns {Number} the row height
  */
  rowHeightForContentIndex: function(idx) {
    var del = this.get('rowDelegate'),
        ret, cache, content, indexes;

    if (del.customRowHeightIndexes && (indexes=del.get('customRowHeightIndexes'))) {
      cache = this._sclv_heightCache ;
      if (!cache) {
        cache = [];
        content = this.get('content');
        indexes.forEach(function(idx) {
          cache[idx] = del.contentIndexRowHeight(this, content, idx);
        }, this);
        // moved down so that the cache is not marked as initialized until it actually is
        this._sclv_heightCache = cache;
      }

      ret = cache[idx];
      if (ret === undefined) ret = del.get('rowHeight');
    } else ret = del.get('rowHeight');

    return ret ;
  },

  /**
    Call this method whenever a row height has changed in one or more indexes.
    This will invalidate the row height cache and reload the content indexes.
    Pass either an index set or a single index number.

    This method is called automatically whenever you change the rowHeight
    or customRowHeightIndexes properties on the collectionRowDelegate.

    @param {SC.IndexSet|Number} indexes
    @returns {SC.ListView} receiver
  */
  rowHeightDidChangeForIndexes: function(indexes) {
    var len = this.get('length');

    // clear any cached offsets
    this._sclv_heightCache = this._sclv_offsetCache = null;

    // find the smallest index changed; invalidate everything past it
    if (indexes && indexes.isIndexSet) indexes = indexes.get('min');
    this.reload(SC.IndexSet.create(indexes, len-indexes));

    // If the row height changes, our entire layout needs to change.
    this.invokeOnce('adjustLayout');
    return this ;
  },

  // ..........................................................
  // SUBCLASS IMPLEMENTATIONS
  //

  /**
    The layout for a ListView is computed from the total number of rows
    along with any custom row heights.
  */
  computeLayout: function() {
    // default layout
    var ret = this._sclv_layout;
    if (!ret) ret = this._sclv_layout = {};
    ret.minHeight = this.rowOffsetForContentIndex(this.get('length'));
    this.set('calculatedHeight', ret.minHeight);
    return ret ;
  },

  /**
    Computes the layout for a specific content index by combining the current
    row heights.

    @param {Number} contentIndex
    @returns {Hash} layout hash for the index provided
  */
  layoutForContentIndex: function(contentIndex) {
    var del = this.get('rowDelegate');

    return {
      top: this.rowOffsetForContentIndex(contentIndex),
      height: this.rowHeightForContentIndex(contentIndex) - del.get('rowPadding') * 2,
      left: 0,
      right: 0
    };
  },

  /**
    Override to return an IndexSet with the indexes that are at least
    partially visible in the passed rectangle.  This method is used by the
    default implementation of computeNowShowing() to determine the new
    nowShowing range after a scroll.

    Override this method to implement incremental rendering.

    The default simply returns the current content length.

    @param {Rect} rect the visible rect or a point
    @returns {SC.IndexSet} now showing indexes
  */
  contentIndexesInRect: function(rect) {
    var rowHeight = this.get('rowDelegate').get('rowHeight'),
        top       = SC.minY(rect),
        bottom    = SC.maxY(rect),
        height    = rect.height || 0,
        len       = this.get('length'),
        offset, start, end;

    // estimate the starting row and then get actual offsets until we are
    // right.
    start = (top - (top % rowHeight)) / rowHeight;
    offset = this.rowOffsetForContentIndex(start);

    // go backwards until top of row is before top edge
    while(start>0 && offset>top) {
      start--;
      offset -= this.rowHeightForContentIndex(start);
    }

    // go forwards until bottom of row is after top edge
    offset += this.rowHeightForContentIndex(start);
    while(start<len && offset<=top) {
      start++;
      offset += this.rowHeightForContentIndex(start);
    }
    if (start<0) start = 0;
    if (start>=len) start=len;


    // estimate the final row and then get the actual offsets until we are
    // right. - look at the offset of the _following_ row
    end = start + ((height - (height % rowHeight)) / rowHeight) ;
    if (end > len) end = len;
    offset = this.rowOffsetForContentIndex(end);

    // walk backwards until top of row is before or at bottom edge
    while(end>=start && offset>=bottom) {
      end--;
      offset -= this.rowHeightForContentIndex(end);
    }

    // go forwards until bottom of row is after bottom edge
    offset += this.rowHeightForContentIndex(end);
    while(end<len && offset<bottom) {
      end++;
      offset += this.rowHeightForContentIndex(end);
    }

    end++; // end should be after start

    if (end<start) end = start;
    if (end>len) end = len ;

    // convert to IndexSet and return
    return SC.IndexSet.create(start, end-start);
  },


  // ..........................................................
  // DRAG AND DROP SUPPORT
  //

  /**
    Default view class used to draw an insertion point, which uses CSS
    styling to show a horizontal line.

    This view's position (top & left) will be automatically adjusted to the
    point of insertion.

    @field
    @type SC.View
  */
  insertionPointView: SC.View.extend({
    classNames: 'sc-list-insertion-point',

    layout: { height: 2 },

    /** @private */
    render: function(context, firstTime) {
      if (firstTime) context.push('<div class="anchor"></div>');
    }
  }),

  /**
    Default implementation will show an insertion point
    @see SC.CollectionView#showInsertionPoint
  */
  showInsertionPoint: function (itemView, dropOperation) {
    var index  = itemView.get('contentIndex'),
      len = this.get('length'),
      level  = itemView.get('outlineLevel'),
      indent = itemView.get('outlineIndent') || 0;

    // show item indented if we are inserting at the end and the last item
    // is a group item.  This is a special case that should really be
    // converted into a more general protocol.
    if ((index >= len) && index>0) {
      var group = this.itemViewForContentIndex(len - 1);
      if (group.get('isGroupView')) {
        level = 1;
        indent = group.get('outlineIndent');
      }
    }

    if (SC.none(level)) level = -1;

    if (dropOperation & SC.DROP_ON) {
      if (itemView !== this._lastDropOnView) {
        this.hideInsertionPoint();

        // If the drag is supposed to drop onto an item, notify the item that it
        // is the current target of the drop.
        itemView.set('isDropTarget', YES);

        // Track the item so that we can clear isDropTarget when the drag changes;
        // versus having to clear it from all items.
        this._lastDropOnView = itemView;
      }
    } else {
      if (this._lastDropOnView) {
        // If there was an item that was the target of the drop previously, be
        // sure to clear it.
        this._lastDropOnView.set('isDropTarget', NO);
        this._lastDropOnView = null;
      }

      var insertionPoint = this._insertionPointView,
        layout = itemView.get('layout'),
        top, left;

      if (!insertionPoint) {
        insertionPoint = this._insertionPointView = this.get('insertionPointView').create();
      }

      // Adjust the position of the insertion point.
      top = layout.top;
      if (dropOperation & SC.DROP_AFTER) top += layout.height;
      left = ((level + 1) * indent) + 12;

      insertionPoint.adjust({ top: top, left: left });
      this.appendChild(insertionPoint);
    }
  },

  /** @see SC.CollectionView#hideInsertionPoint */
  hideInsertionPoint: function() {
    // If there was an item that was the target of the drop previously, be
    // sure to clear it.
    if (this._lastDropOnView) {
      this._lastDropOnView.set('isDropTarget', NO);
      this._lastDropOnView = null;
    }

    var view = this._insertionPointView;
    if (view) view.removeFromParent().destroy();
    this._insertionPointView = null;
  },

  /**
    Compute the insertion index for the passed location.  The location is
    a point, relative to the top/left corner of the receiver view.  The return
    value is an index plus a dropOperation, which is computed as such:

      - if outlining is not used and you are within 5px of an edge, DROP_BEFORE
        the item after the edge.
      - if outlining is used and you are within 5px of an edge and the previous
        item has a different outline level then the next item, then DROP_AFTER
        the previous item if you are closer to that outline level.
      - if dropOperation = SC.DROP_ON and you are over the middle of a row, then
        use DROP_ON.

    @see SC.CollectionView.insertionIndexForLocation
  */
  insertionIndexForLocation: function(loc, dropOperation) {
    var locRect = {x:loc.x, y:loc.y, width:1, height:1},
        indexes = this.contentIndexesInRect(locRect),
        index   = indexes.get('min'),
        len     = this.get('length'),
        min, max, diff, clevel, cindent, plevel, pindent, itemView, pgroup;

    // if there are no indexes in the rect, then we need to either insert
    // before the top item or after the last item.  Figure that out by
    // computing both.
    if (SC.none(index) || index < 0) {
      if ((len === 0) || (loc.y <= this.rowOffsetForContentIndex(0))) index = 0;
      else if (loc.y >= this.rowOffsetForContentIndex(len)) index = len;
    }

    // figure the range of the row the location must be within.
    min = this.rowOffsetForContentIndex(index);
    max = min + this.rowHeightForContentIndex(index);

    // now we know which index we are in.  if dropOperation is DROP_ON, figure
    // if we can drop on or not.
    if (dropOperation == SC.DROP_ON) {
      // editable size - reduce height by a bit to handle dropping
      if (this.get('isEditable')) diff = Math.min(Math.floor((max - min) * 0.2), 5);
      else diff = 0;

      // if we're inside the range, then DROP_ON
      if (loc.y >= (min + diff) || loc.y <= (max + diff)) {
        return [index, SC.DROP_ON];
      }
    }

    // finally, let's decide if we want to actually insert before/after.  Only
    // matters if we are using outlining.
    if (index>0) {

      itemView = this.itemViewForContentIndex(index-1);
      pindent  = (itemView ? itemView.get('outlineIndent') : 0) || 0;
      plevel   = itemView ? itemView.get('outlineLevel') : 0;

      if (index<len) {
        itemView = this.itemViewForContentIndex(index);
        clevel   = itemView ? itemView.get('outlineLevel') : 0;
        cindent  = (itemView ? itemView.get('outlineIndent') : 0) || 0;
        cindent  *= clevel;
      } else {
        clevel = itemView.get('isGroupView') ? 1 : 0; // special case...
        cindent = pindent * clevel;
      }

      pindent  *= plevel;

      // if indent levels are different, then try to figure out which level
      // it should be on.
      if ((clevel !== plevel) && (cindent !== pindent)) {

        // use most inner indent as boundary
        if (pindent > cindent) {
          index--;
          dropOperation = SC.DROP_AFTER;
        }
      }
    }

    // we do not support dropping before a group item.  If dropping before
    // a group item, always try to instead drop after the previous item.  If
    // the previous item is also a group then, well, dropping is just not
    // allowed.  Note also that dropping at 0, first item must not be group
    // and dropping at length, last item must not be a group
    //
    if (dropOperation === SC.DROP_BEFORE) {
      itemView = (index<len) ? this.itemViewForContentIndex(index) : null;
      if (!itemView || itemView.get('isGroupView')) {
        if (index>0) {
          itemView = this.itemViewForContentIndex(index-1);

          // don't allow a drop if the previous item is a group view and we're
          // insert before the end.  For the end, allow the drop if the
          // previous item is a group view but OPEN.
          if (!itemView.get('isGroupView') || (itemView.get('disclosureState') === SC.BRANCH_OPEN)) {
            index = index-1;
            dropOperation = SC.DROP_AFTER;
          } else index = -1;

        } else index = -1;
      }

      if (index<0) dropOperation = SC.DRAG_NONE ;
    }

    // return whatever we came up with
    return [index, dropOperation];
  },

  // ..........................................................
  // INTERNAL SUPPORT
  //

  /** @private */
  init: function() {
    arguments.callee.base.apply(this,arguments);
    this._sclv_rowDelegateDidChange();
  }

});

/* >>>>>>>>>> BEGIN source/views/grid.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
sc_require('views/list');


/** @class

  A grid view renders a collection of items in a grid of rows and columns.

  ## Dropping on an Item

  When the grid view is configured to accept drags and drops onto its items, it
  will set the isDropTarget property on the target item accordingly.  This
  allows you to modify the appearance of the drop target grid item accordingly
  (@see SC.ListItemView#isDropTarget).

  @extends SC.ListView
  @author Charles Jolley
  @version 1.0
*/
SC.GridView = SC.ListView.extend(
/** @scope SC.GridView.prototype */ {

  /**
    @type Array
    @default ['sc-grid-view']
    @see SC.View#classNames
  */
  classNames: ['sc-grid-view'],

  /**
    @type Hash
    @default { left:0, right:0, top:0, bottom:0 }
    @see SC.View#layout
  */
  layout: { left: 0, right: 0, top: 0, bottom: 0 },

  /**
    The common row height for grid items.

    The value should be an integer expressed in pixels.

    @type Number
    @default 48
  */
  rowHeight: 48,

  /**
    The minimum column width for grid items.  Items will actually
    be laid out as needed to completely fill the space, but the minimum
    width of each item will be this value.

    @type Number
    @default 64
  */
  columnWidth: 64,

  /**
    The default example item view will render text-based items.

    You can override this as you wish.

    @type SC.View
    @default SC.LabelView
  */
  exampleView: SC.LabelView,

  /**
    Possible values:

      - SC.HORIZONTAL_ORIENTATION
      - SC.VERTICAL_ORIENTATION

    @type String
    @default SC.HORIZONTAL_ORIENTATION
  */
  insertionOrientation: SC.HORIZONTAL_ORIENTATION,

  /** @private */
  itemsPerRow: function () {
    var frameWidth = this.get('frame').width,
      columnWidth = this.get('columnWidth') || 0;

    return (columnWidth < 1) ? 1 : Math.floor(frameWidth / columnWidth);
  }.property('columnWidth', '_frameWidth').cacheable(),

  /** @private
    Find the contentIndexes to display in the passed rect. Note that we
    ignore the width of the rect passed since we need to have a single
    contiguous range.
  */
  contentIndexesInRect: function (rect) {
    var rowHeight = this.get('rowHeight') || 48,
        itemsPerRow = this.get('itemsPerRow'),
        min = Math.floor(SC.minY(rect) / rowHeight) * itemsPerRow,
        max = Math.ceil(SC.maxY(rect) / rowHeight) * itemsPerRow;
    return SC.IndexSet.create(min, max - min);
  },

  /** @private */
  layoutForContentIndex: function (contentIndex) {
    var rowHeight = this.get('rowHeight') || 48,
        frameWidth = this.get('frame').width,
        itemsPerRow = this.get('itemsPerRow'),
        columnWidth = Math.floor(frameWidth / itemsPerRow),
        row = Math.floor(contentIndex / itemsPerRow),
        col = contentIndex - (itemsPerRow * row);

    return {
      left: col * columnWidth,
      top: row * rowHeight,
      height: rowHeight,
      width: columnWidth
    };
  },

  /** @private
    Overrides default CollectionView method to compute the minimum height
    of the list view.
  */
  computeLayout: function () {
    var content = this.get('content'),
      count = (content) ? content.get('length') : 0,
      rowHeight = this.get('rowHeight') || 48,
      itemsPerRow = this.get('itemsPerRow'),
      rows = Math.ceil(count / itemsPerRow);

    // use this cached layout hash to avoid allocing memory...
    var ret = this._cachedLayoutHash;
    if (!ret) ret = this._cachedLayoutHash = {};

    // set minHeight
    ret.minHeight = rows * rowHeight;
    this.set('calculatedHeight', ret.minHeight);
    return ret;
  },

  /**
    Default view class used to draw an insertion point, which uses CSS
    styling to show a horizontal line.

    This view's position (top & left) will be automatically adjusted to the
    point of insertion.

    @field
    @type SC.View
  */
  insertionPointClass: SC.View.extend({
    classNames: ['sc-grid-insertion-point'],

    layout: { width: 2 },

    render: function (context, firstTime) {
      if (firstTime) context.push('<div class="anchor"></div>');
    }
  }),

  /** @private */
  showInsertionPoint: function (itemView, dropOperation) {
    if (!itemView) return;

    // if drop on, then just add a class...
    if (dropOperation & SC.DROP_ON) {
      if (itemView !== this._lastDropOnView) {
        this.hideInsertionPoint();

        // If the drag is supposed to drop onto an item, notify the item that it
        // is the current target of the drop.
        itemView.set('isDropTarget', YES);

        // Track the item so that we can clear isDropTarget when the drag changes;
        // versus having to clear it from all items.
        this._lastDropOnView = itemView;
      }

    } else {
      if (this._lastDropOnView) {
        // If there was an item that was the target of the drop previously, be
        // sure to clear it.
        this._lastDropOnView.set('isDropTarget', NO);
        this._lastDropOnView = null;
      }

      var insertionPoint = this._insertionPointView,
        layout = itemView.get('layout'),
        top, left;

      if (!insertionPoint) {
        insertionPoint = this._insertionPointView = this.insertionPointClass.create();
      }

      // Adjust the position of the insertion point.
      top = layout.top;
      left = layout.left;
      if (dropOperation & SC.DROP_AFTER) left += layout.width;
      height = layout.height;

      // Adjust the position of the insertion point.
      insertionPoint.adjust({ top: top, left: left, height: height });
      this.appendChild(insertionPoint);
    }
  },

  /** @see SC.CollectionView#hideInsertionPoint */
  hideInsertionPoint: function () {
    // If there was an item that was the target of the drop previously, be
    // sure to clear it.
    if (this._lastDropOnView) {
      this._lastDropOnView.set('isDropTarget', NO);
      this._lastDropOnView = null;
    }

    var view = this._insertionPointView;
    if (view) view.removeFromParent().destroy();
    this._insertionPointView = null;
  },

  /** @private */
  insertionIndexForLocation: function (loc, dropOperation) {
    var f = this.get('frame'),
        sf = this.get('clippingFrame'),
        itemsPerRow = this.get('itemsPerRow'),
        columnWidth = Math.floor(f.width / itemsPerRow),
        row = Math.floor((loc.y - f.y - sf.y) / this.get('rowHeight'));

    var retOp = SC.DROP_BEFORE,
        offset = (loc.x - f.x - sf.x),
        col = Math.floor(offset / columnWidth),
        percentage = (offset / columnWidth) - col;

    // if the dropOperation is SC.DROP_ON and we are in the center 60%
    // then return the current item.
    if (dropOperation === SC.DROP_ON) {
      if (percentage > 0.80) col++;
      if ((percentage >= 0.20) && (percentage <= 0.80)) {
        retOp = SC.DROP_ON;
      }
    } else {
      if (percentage > 0.45) col++;
    }

    // convert to index
    var ret = (row * itemsPerRow) + col;
    return [ret, retOp];
  },

  /** @private
    Since GridView lays out items evenly from left to right, if the width of the
    frame changes, all of the item views on screen are potentially in
    the wrong position.

    Update all of their layouts if necessary.
  */
  _gv_frameDidChange: function () {
    var frame = this.get('frame'),
      lastFrameWidth = this._lastFrameWidth,
      width = frame.width;

    // A change to the width of the frame is the only variable that
    // alters the layout of item views and our computed layout.
    if (!SC.none(lastFrameWidth) && width !== lastFrameWidth) {
      var itemView,
        nowShowing = this.get('nowShowing');

      // Internal property used to indicate a possible itemsPerRow change.  This
      // is better than having itemsPerRow dependent on frame which changes frequently.
      this.set('_frameWidth', width);

      // Only loop through the now showing indexes, if the content was sparsely
      // loaded we would inadvertently load all the content.
      nowShowing.forEach(function (idx) {
        itemView = this.itemViewForContentIndex(idx);
        itemView.adjust(this.layoutForContentIndex(idx));
      }, this);
    }

    this._lastFrameWidth = width;
  }.observes('frame'),

  /** @private Recompute our layout if itemsPerRow actually changes. */
  _gv_itemsPerRowDidChange: function () {
    var itemsPerRow = this.get('itemsPerRow'),
      lastItemsPerRow = this._lastItemsPerRow || 0;

    if (itemsPerRow !== lastItemsPerRow) {
      this.invokeOnce('adjustLayout');
    }

    this._lastItemsPerRow = itemsPerRow;
  }.observes('itemsPerRow')

});

/* >>>>>>>>>> BEGIN source/views/image_button.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/** @class

  Provides a button that displays an image instead of the standard button
  user interface.

  It behaves the same as an SC.ButtonView, but has an image property that
  should be set to a unique class name.

  For example:

      SC.ImageButtonView.create({
        action: 'imageButtonWasClicked',

        image: 'my-image-button-icon'
      });

  You could then add some CSS rule for a normal state:

      $theme.image-button .my-image-button-icon {
        @include slice('my-image-button-image.png');

        // and an active state:
        &.active {
          @include slice('my-image-button-image-active.png');
        }
      }

  Note: in addition to using SCSS and the Chance directives shown above, you
  can use normal CSS syntax and sc_static.

  @extends SC.View
  @extends SC.Control
  @extends SC.ButtonView
  @since SproutCore 1.5
*/
SC.ImageButtonView = SC.ButtonView.extend(
/** @scope SC.ImageButtonView.prototype */ {

  /**
    @type Array
    @default ['sc-image-button-view']
    @see SC.View#classNames
  */
  classNames: ['sc-image-button-view'],

  /**
    Unlike SC.ButtonView, SC.ImageButtonView does not have a default theme
    that needs to be applied for backwards compatibility.

    @type String
    @default null
  */
  themeName: null,

  /**
    @type String
    @default 'imageButtonRenderDelegate'
  */
  renderDelegateName: 'imageButtonRenderDelegate',

  /**
    @type Array
    @default ['image']
  */
  displayProperties: ['image'],

  /**
    A class name that will be applied to the img tag of the button.

    @type String
    @default null
  */
  image: null

});

/* >>>>>>>>>> BEGIN source/views/toolbar.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/**
  Layout properties needed to anchor a view to the top.

  @static
  @constant
  @type Hash
  @default `{ top: 0 }`
*/
SC.ANCHOR_TOP = { top: 0 };

/**
  Layout properties needed to anchor a view to the left.

  @static
  @constant
  @type Hash
  @default `{ left: 0 }`
*/
SC.ANCHOR_LEFT = { left: 0 };

/*
  Layout properties to anchor a view to the top left

  @static
  @constant
  @type Hash
  @default `{ top: 0, left: 0 }`
*/
SC.ANCHOR_TOP_LEFT = { top: 0, left: 0 };

/**
  Layout properties to anchoe view to the bottom.

  @static
  @constant
  @type Hash
  @default `{ bottom: 0 }`
*/
SC.ANCHOR_BOTTOM = { bottom: 0 };

/**
  Layout properties to anchor a view to the right.

  @static
  @constant
  @type Hash
  @default `{ right: 0 }`
*/
SC.ANCHOR_RIGHT = { right: 0 };

/**
  Layout properties to anchor a view to the bottom right.

  @static
  @constant
  @type Hash
  @default `{ top: 0, right: 0 }`
*/
SC.ANCHOR_BOTTOM_RIGHT = { bottom: 0, right: 0 };

/** @class

  SC.ToolbarView is a simple horizontal view that has been styled like a
  toolbar and can be easily anchored at the top or bottom of a parent view.

  To anchor to the top of the parent view, set `anchorLocation` to
  `SC.ANCHOR_TOP` or to anchor to the bottom, set `anchorLocation` to
  `SC.ANCHOR_BOTTOM`.  The default layout of SC.Toolbar is
  `{ left: 0, right: 0, height: 32, zIndex: 10 }` and so by setting the value of
  `anchorLocation`, the layout will be modified to either:

  `SC.ANCHOR_TOP:`
      { borderBottom: 1, top: 0, left: 0, right: 0, height: 32, zIndex: 10 }

  `SC.ANCHOR_BOTTOM:`
      { borderTop: 1, bottom: 0, left: 0, right: 0, height: 32, zIndex: 10 }

  Of course, you can always override the layout property yourself in order to
  adjust the height, border and zIndex values.

  @extends SC.View
  @since SproutCore 1.0
*/
SC.ToolbarView = SC.View.extend(
/** @scope SC.ToolbarView.prototype */ {

  /**
    @type Array
    @default ['sc-toolbar-view']
    @see SC.View#classNames
  */
  classNames: ['sc-toolbar-view'],

  /**
    The WAI-ARIA role for toolbar view.

    @type String
    @default 'toolbar'
    @readOnly
  */
  ariaRole: 'toolbar',

  /**
    @type String
    @default 'toolbarRenderDelegate'
  */
  renderDelegateName: 'toolbarRenderDelegate',

  /**
    Default anchor location.  This will be applied automatically to the
    toolbar layout if you set it. Possible values:

      - SC.ANCHOR_TOP
      - SC.ANCHOR_LEFT
      - SC.ANCHOR_TOP_LEFT
      - SC.ANCHOR_BOTTOM
      - SC.ANCHOR_RIGHT
      - SC.ANCHOR_BOTTOM_RIGHT

    @type String
    @default null
  */
  anchorLocation: null,

  // ..........................................................
  // INTERNAL SUPPORT
  //

  /** @private */
  layout: { left: 0, right: 0, height: 32, zIndex: 10 },

  /** @private */
  init: function () {
    // apply anchor location before setting up the rest of the view.
    if (this.anchorLocation) {
      this.layout = SC.merge(this.layout, this.anchorLocation);

      switch (this.anchorLocation) {
      case SC.ANCHOR_TOP:
      case SC.ANCHOR_TOP_LEFT:
        this.layout.borderBottom = 1;
        break;
      case SC.ANCHOR_BOTTOM:
      case SC.ANCHOR_BOTTOM_RIGHT:
        this.layout.borderTop = 1;
        break;
      default:
      }
    }

    arguments.callee.base.apply(this,arguments);
  }

});


/* >>>>>>>>>> BEGIN source/views/workspace.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require("views/toolbar");

/** @class
  WorkspaceView manages a content view and two optional toolbars (top and bottom).
  You want to use WorkspaceView in one of two situations: iPhone apps where the toolbars
  need to change size automatically based on orientation (this does that, isn't that
  handy!) and iPad apps where you would like the masterIsHidden property to pass through.

  @since SproutCore 1.2
  @extends SC.View
  @author Alex Iskander
*/
SC.WorkspaceView = SC.View.extend(
/** @scope SC.WorkspaceView.prototype */ {

  /**
    @type Array
    @default ['sc-workspace-view']
    @see SC.View#classNames
  */
  classNames: ["sc-workspace-view"],

  /**
    @type Array
    @default "hasTopToolbar hasBottomToolbar".w()
    @see SC.View#displayProperties
  */
  displayProperties: ["hasTopToolbar", "hasBottomToolbar"],

  /**
    @type String
    @default 'workspaceRenderDelegate'
  */
  renderDelegateName: 'workspaceRenderDelegate',

  /**
    @type SC.View
    @default SC.ToolbarView
  */
  topToolbar: SC.ToolbarView.extend(),

  /**
    @type SC.View
    @default null
  */
  bottomToolbar: null,

  /**
    The content. Must NOT be null.

    @type SC.View
    @default SC.View
  */
  contentView: SC.View.extend(),

  /**
    If you want to automatically resize the toolbars like iPhone
    apps should, set to YES.

    @type Boolean
    @default NO
  */
  autoResizeToolbars: NO,

  /**
    @type Number
    @default 44
  */
  defaultToolbarSize: 44,

  /**
    @type Number
    @default 44
  */
  largeToolbarSize: 44,

  /**
    @type Number
    @default 30
  */
  smallToolbarSize: 30,

  /**
    @field
    @type Number
  */
  toolbarSize: function() {
    if (!this.get("autoResizeToolbars")) return this.get("defaultToolbarSize");
    if (this.get("orientation") === SC.HORIZONTAL_ORIENTATION) return this.get("smallToolbarSize");
    return this.get("largeToolbarSize");
  }.property("autoHideMaster", "orientation"),

  /**
    Tracks the orientation of the view. Possible values:

      - SC.HORIZONTAL_ORIENTATION
      - SC.PORTRAIT_ORIENTATION

    @field
    @type String
    @default SC.HORIZONTAL_ORIENTATION
  */
  orientation: function() {
    var f = this.get("frame");
    if (f.width > f.height) return SC.HORIZONTAL_ORIENTATION;
    else return SC.VERTICAL_ORIENTATION;
  }.property("frame").cacheable(),

  /**
    @type Boolean
    @default NO
  */
  masterIsHidden: NO,

  /** @private */
  masterIsHiddenDidChange: function() {
    var t, mih = this.get("masterIsHidden");
    if (t = this.get("topToolbar")) t.set("masterIsHidden", mih);
    if (t = this.get("bottomToolbar")) t.set("masterIsHidden", mih);
  }.observes("masterIsHidden"),

  /// INTERNAL CODE. HERE, THERE BE MONSTERS!

  /**
    @private
    Whenever something that affects the tiling changes (for now, just toolbarSize, but if
    we allow dynamic changing of toolbars in future, this could include toolbars themselves),
    we need to update the tiling.
  */
  _scmd_tilePropertyDidChange: function() {
    this.invokeOnce("_scws_tile");
  }.observes("toolbarSize"),

  /** @private
    Creates the child views. Specifically, instantiates master and detail views.
  */
  createChildViews: function() {
    arguments.callee.base.apply(this,arguments);

    var topToolbar = this.get("topToolbar");
    if (topToolbar) {
      topToolbar = this.topToolbar = this.activeTopToolbar = this.createChildView(topToolbar);
      this.appendChild(topToolbar);
    }

    var bottomToolbar = this.get("bottomToolbar");
    if (bottomToolbar) {
      bottomToolbar = this.bottomToolbar = this.activeBottomToolbar = this.createChildView(bottomToolbar);
      this.appendChild(bottomToolbar);
    }

    var content = this.get("contentView");
    content = this.contentView = this.activeContentView = this.createChildView(content);
    this.appendChild(content);

    this.invokeOnce("_scws_tile");
  },

  /**
    @private
    Tiles the views as necessary.
  */
  _scws_tile: function() {
    var contentTop = 0, contentBottom = 0,
        topToolbar = this.get("topToolbar"),
        bottomToolbar = this.get("bottomToolbar"),
        content = this.get("contentView"),
        toolbarSize = this.get("toolbarSize");

      // basically, if there is a top toolbar, we position it and change contentTop.
    if (topToolbar) {
      topToolbar.set("layout", {
        left: 0, right: 0, top: 0, height: toolbarSize
      });
      contentTop += toolbarSize;
    }

    // same for bottom
    if (bottomToolbar) {
      bottomToolbar.set("layout", {
        left: 0, right: 0, bottom: 0, height: toolbarSize
      });
      contentBottom += toolbarSize;
    }

    // finally, position content
    this.contentView.set("layout", {
      left: 0, right: 0, top: contentTop, bottom: contentBottom
    });
  },

  /** @private
    Returns YES if a top toolbar is present.
  */
  hasTopToolbar: function() {
    if (this.get("topToolbar")) return YES;
    return NO;
  }.property("topToolbar").cacheable(),

  /** @private
    Returns YES if a bottom toolbar is present.
  */
  hasBottomToolbar: function() {
    if (this.get("bottomToolbar")) return YES;
    return NO;
  }.property("bottomToolbar").cacheable(),

  /** @private
    Called by the individual toolbar/contentView observers at runloop end when the toolbars change.
  */
  childDidChange: function() {
    this._scws_tile();
  },

  /** @private
    For subclassing, this is the currently displaying top toolbar.
  */
  activeTopToolbar: null,

  /** @private
    For subclassing, this is the currently displaying bottom toolbar.
  */
  activeBottomToolbar: null,

  /** @private
    For subclassing, this is the currently displaying content view.
  */
  activeContentView: null,

  /** @private
    Called when the top toolbar changes. It appends it, removes any old ones, and calls toolbarsDidChange.

    You may want to override this if, for instance, you want to add transitions of some sort (should be trivial).
  */
  topToolbarDidChange: function() {
    var active = this.activeTopToolbar, replacement = this.get("topToolbar");
    if (active) {
      if (active.createdByParent) {
        container.removeChildAndDestroy(active);
      } else {
        container.removeChild(active);
      }
    }
    if (replacement) {
      this.appendChild(replacement);
    }

    this.activeTopToolbar = replacement;
    this.invokeLast("childDidChange");
  }.observes("topToolbar"),

  /**
    @private
  */
  bottomToolbarDidChange: function() {
    var active = this.activeBottomToolbar, replacement = this.get("bottomToolbar");
    if (active) {
      if (active.createdByParent) {
        container.removeChildAndDestroy(active);
      } else {
        container.removeChild(active);
      }
    }
    if (replacement) {
      this.appendChild(replacement);
    }

    this.activeBottomToolbar = replacement;
    this.invokeLast("childDidChange");
  }.observes("bottomToolbar"),

  /** @private */
  contentViewDidChange: function() {
    var active = this.activeContentView, replacement = this.get("contentView");
    if (active) {
      if (active.createdByParent) {
        container.removeChildAndDestroy(active);
      } else {
        container.removeChild(active);
      }
    }
    if (replacement) {
      this.appendChild(replacement);
    }

    this.activeContentView = replacement;
    this.invokeLast("childDidChange");
  }.observes("contentView")

});

/* >>>>>>>>>> BEGIN source/views/master_detail.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require("views/workspace");
sc_require("views/toolbar");


/** @class
  Master/Detail view is a simple view which manages a master view and a detail view.
  This is not all that different from a SplitView, except that, for the moment (this
  will hopefully change when SplitView becomes more palatable) the split point is not
  actually changeable and the split is always vertical.

  So, why use it when it is limited? Well, simple: it can hide the left side. Completely.
  As in, there will be no split divider anymore. There will be no nothing. It will be gone.
  Removed from DOM. Gone on to meet its maker, bereft of life, it rests in peace. If it weren't
  for the possibility of opening it up in a picker it would be pushing up the daisies!

  Yes, it has a built-in option for opening the master portion in a PickerPane. This is THE KILLER
  FEATURES. It is a command on the view: popupMasterPicker. And it is really really easy to call:
  make a toolbar button with an action "popupMasterPicker". That's it.

  An interesting feature is that it sets the master and detail views' masterIsVisible settings,
  allowing them to know if the master is visible.

  @since SproutCore 1.2
*/
SC.MasterDetailView = SC.View.extend(
/** @scope SC.MasterDetailView.prototype */ {

  /**
    @type Array
    @default ['sc-master-detail-view']
    @see SC.View#classNames
  */
  classNames: ["sc-master-detail-view"],

  /**
    @type String
    @default 'masterDetailRenderDelegate'
  */
  renderDelegateName: 'masterDetailRenderDelegate',


  // ..........................................................
  // Properties
  //

  /**
    The master view. For your development pleasure, it defaults to a
    WorkspaceView with a top toolbar.

    @type SC.View
    @default SC.WorkspaceView
  */
  masterView: SC.WorkspaceView.extend({
    topToolbar: SC.ToolbarView.extend({
    }),
    contentView: SC.View.extend({ backgroundColor: "white" })
  }),

  /**
    The detail view. For your development experience, it defaults to holding
    a top toolbar view with a button that closes/shows master. Come take a peek at
    the code to see what it looks like--it is so simple.

    @type SC.View
    @default SC.WorkspaceView
  */
  detailView: SC.WorkspaceView.extend({
    topToolbar: SC.ToolbarView.extend({
      childViews: ["showHidePicker"],
      showHidePicker: SC.ButtonView.extend({
        layout: { left: 7, centerY: 0, height: 30, width: 100 },
        controlSize: SC.AUTO_CONTROL_SIZE,
        title: "Picker",
        action: "toggleMasterPicker",
        isVisible: NO,
        isVisibleBinding: ".parentView.masterIsHidden"
      })
    })
  }),

  /**
    Whether to automatically hide the master panel in portrait orientation.

    By default, this property is a computed property based on whether the browser is a touch
    browser. Your purpose in overriding it is either to disable it from automatically
    disappearing on iPad and other touch devices, or force it to appear when a desktop
    browser changes.

    @field
    @type Boolean
    @default NO
  */
  autoHideMaster: function() {
    if (SC.platform.touch) return YES;
    return NO;
  }.property().cacheable(),

  /**
    The width of the 'master' side of the master/detail view.

    @type Number
    @default 250
  */
  masterWidth: 250,

  /**
    The width of the divider between the master and detail views.

    @type Number
    @default From theme, or 1.
  */
  dividerWidth: SC.propertyFromRenderDelegate('dividerWidth', 1),

  /**
    A property (computed) that says whether the master view is hidden.

    @field
    @type Boolean
    @default NO
    @observes autoHideMaster
    @observes orientation
  */
  masterIsHidden: function() {
    if (!this.get("autoHideMaster")) return NO;
    if (this.get("orientation") === SC.HORIZONTAL_ORIENTATION) return NO;
    return YES;
  }.property("autoHideMaster", "orientation"),

  /**
    Tracks the orientation of the view. Possible values:

      - SC.VERTICAL_ORIENTATION
      - SC.HORIZONTAL_ORIENTATION

    @type String
    @default SC.VERTICAL_ORIENTATION
  */
  orientation: SC.VERTICAL_ORIENTATION,

  /** @private */
  _scmd_frameDidChange: function() {
    var f = this.get("frame"), ret;
    if (f.width > f.height) ret = SC.HORIZONTAL_ORIENTATION;
    else ret = SC.VERTICAL_ORIENTATION;

    this.setIfChanged('orientation', ret);
  }.observes('frame'),

  /** @private */
  init: function() {
    arguments.callee.base.apply(this,arguments);
    this._scmd_frameDidChange();
    this._scmd_masterIsHiddenDidChange();
  },

  /**
    If the master is hidden, this toggles the master picker pane.
    Of course, since pickers are modal, this actually only needs to handle showing.

    @param {SC.View} view The view to anchor the picker to
  */
  toggleMasterPicker: function(view) {
    if (!this.get("masterIsHidden")) return;
    if (this._picker && this._picker.get("isVisibleInWindow")) {
      this.hideMasterPicker();
    } else {
      this.showMasterPicker(view);
    }
  },

  /**
    @param {SC.View} view The view to anchor the picker to
  */
  showMasterPicker: function(view) {
    if (this._picker && this._picker.get("isVisibleInWindow")) return;
    if (!this._picker) {
      var pp = this.get("pickerPane");
      this._picker = pp.create({ });
    }

    this._picker.set("contentView", this.get("masterView"));
    this._picker.set("extraRightOffset", this.get("pointerDistanceFromEdge"));

    this.showPicker(this._picker, view);
  },

  hideMasterPicker: function() {
    if (this._picker && this._picker.get("isVisibleInWindow")) {
      this.hidePicker(this._picker);
    }
  },

  /**
    @param {SC.PickerPane} picker The picker to popup
    @param {SC.View} view The view to anchor the picker to
  */
  showPicker: function(picker, view) {
    picker.popup(view, SC.PICKER_POINTER, [3, 0, 1, 2, 3], [9, -9, -18, 18]);
  },

  /**
    @param {SC.PickerPane} picker The picker to popup
  */
  hidePicker: function(picker) {
    picker.remove();
  },

  /**
    The picker pane class from which to create a picker pane.

    This defaults to one with a special theme.

    @type SC.PickerPane
    @default SC.PickerPane
  */
  pickerPane: SC.PickerPane.extend({
    layout: { width: 250, height: 480 },
    themeName: 'popover'
  }),


  // ..........................................................
  // Internal Support
  //

  /** @private */
  _picker: null,

  /** @private */
  pointerDistanceFromEdge: 46,

  /** @private
    Updates masterIsHidden in child views.
  */
  _scmd_masterIsHiddenDidChange: function() {
    var mih = this.get("masterIsHidden");
    this.get("masterView").set("masterIsHidden", mih);
    this.get("detailView").set("masterIsHidden", mih);
  }.observes("masterIsHidden"),

  /** @private
    When the frame changes, we don't need to do anything. We use smart positioning.
    However, if the orientation were to change, well, then we might need to do something.
  */
  _scmd_orientationDidChange: function() {
    this.invokeOnce("_scmd_tile");
  }.observes("orientation"),

  /** @private
    Observes properties which require retiling.
  */
  _scmd_retileProperties: function() {
    this.invokeOnce("_scmd_tile");
  }.observes("masterIsHidden", "masterWidth"),

  /** @private
    Instantiates master and detail views.
  */
  createChildViews: function() {
    var master = this.get("masterView");
    master = this.masterView = this.createChildView(master);

    var detail = this.get("detailView");
    detail = this.detailView = this.createChildView(detail);
    this.appendChild(detail);

    this.invokeOnce("_scmd_tile");
  },

  /** @private */
  _masterIsDrawn: NO, // whether the master is in the view

  /** @private
    Tiles the views as necessary.
  */
  _scmd_tile: function() {
    // first, determine what is and is not visible.
    var masterIsVisible = !this.get('masterIsHidden');

    // now, tile
    var masterWidth = this.get('masterWidth'),
        master = this.get('masterView'),
        detail = this.get('detailView');

    if (masterIsVisible) {
      // hide picker if needed
      this.hideMasterPicker();

      // draw master if needed
      if (!this._masterIsDrawn) {
        if (this._picker) this._picker.set('contentView', null);
        this.appendChild(master);
        this._masterIsDrawn = YES;
      }

      // set master layout
      master.set('layout', {
        left: 0, top: 0, bottom: 0, width: masterWidth
      });

      // and child, naturally
      var extra = this.get('dividerWidth');
      detail.set("layout", { left: masterWidth + extra, right: 0, top: 0, bottom: 0 });
    } else {
      // remove master if needed
      if (this._masterIsDrawn) {
        // Removes the child from the document, but doesn't destroy it or its layer.
        this.removeChild(master);
        this._masterIsDrawn = NO;
      }

      // and child, naturally
      detail.set('layout', { left: 0, right: 0, top: 0, bottom: 0 });
    }
  }

});

/* >>>>>>>>>> BEGIN source/views/scroller.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/** @class

  Displays a horizontal or vertical scroller.  You will not usually need to
  work with scroller views directly, but you may override this class to
  implement your own custom scrollers.

  Because the scroller uses the dimensions of its constituent elements to
  calculate layout, you may need to override the default display metrics.

  You can either create a subclass of ScrollerView with the new values, or
  provide your own in your theme:

      SC.mixin(SC.ScrollerView.prototype, {
        scrollbarThickness: 14,
        capLength: 18,
        capOverlap: 14,
        buttonOverlap: 11,
        buttonLength: 41
      });

  You can change whether scroll buttons are displayed by setting the
  hasButtons property.

  @extends SC.View
  @since SproutCore 1.0
*/
SC.ScrollerView = SC.View.extend(
/** @scope SC.ScrollerView.prototype */ {

  /**
    @type Array
    @default ['sc-scroller-view']
    @see SC.View#classNames
  */
  classNames: ['sc-scroller-view'],

  /**
    @type Array
    @default 'thumbPosition thumbLength controlsHidden'.w()
    @see SC.View#displayProperties
  */
  displayProperties: ['thumbPosition', 'thumbLength', 'controlsHidden'],

  /**
    The WAI-ARIA role for scroller view.

    @type String
    @default 'scrollbar'
    @readOnly
  */
  ariaRole: 'scrollbar',


  // ..........................................................
  // PROPERTIES
  //

  /**
    If YES, a click on the track will cause the scrollbar to scroll to that position.
    Otherwise, a click on the track will cause a page down.

    In either case, alt-clicks will perform the opposite behavior.

    @type Boolean
    @default NO
  */
  shouldScrollToClick: NO,


  /** @private
    The in-touch-scroll value.
  */
  _touchScrollValue: NO,

  /**
    The value of the scroller.

    The value represents the position of the scroller's thumb.

    @field
    @type Number
    @observes maximum
    @observes minimum
  */
  value: function(key, val) {
    var minimum = this.get('minimum');
    if (val !== undefined) {
      this._scs_value = val;
    }

    val = this._scs_value || minimum; // default value is at top/left
    return Math.max(Math.min(val, this.get('maximum')), minimum) ;
  }.property('maximum', 'minimum').cacheable(),

  /**
    @type Number
    @observes value
  */
  displayValue: function() {
    var ret;
    if (this.get("_touchScrollValue")) ret = this.get("_touchScrollValue");
    else ret = this.get("value");
    return ret;
  }.property("value", "_touchScrollValue").cacheable(),

  /**
    The portion of the track that the thumb should fill. Usually the
    proportion will be the ratio of the size of the scroll view's content view
    to the size of the scroll view.

    Should be specified as a value between 0.0 (minimal size) and 1.0 (fills
    the slot). Note that if the proportion is 1.0 then the control will be
    disabled.

    @type Number
    @default 0.0
  */
  proportion: 0,

  /**
    The maximum offset value for the scroller.  This will be used to calculate
    the internal height/width of the scroller itself.

    When set less than the height of the scroller, the scroller is disabled.

    @type Number
    @default 100
  */
  maximum: 100,

  /**
    The minimum offset value for the scroller.  This will be used to calculate
    the internal height/width of the scroller itself.

    @type Number
    @default 0
  */
  minimum: 0,

  /**
    YES to enable scrollbar, NO to disable it.  Scrollbars will automatically
    disable if the maximum scroll width does not exceed their capacity.

    @field
    @type Boolean
    @default YES
    @observes proportion
  */
  isEnabled: function(key, value) {
    if (value !== undefined) {
      this._scsv_isEnabled = value;
    }

    if (this._scsv_isEnabled !== undefined) {
      return this._scsv_isEnabled;
    }

    return this.get('proportion') < 1;
  }.property('proportion').cacheable(),

  /** @private */
  _scsv_isEnabled: undefined,

  /**
    Determine the layout direction.  Determines whether the scrollbar should
    appear horizontal or vertical.  This must be set when the view is created.
    Changing this once the view has been created will have no effect. Possible
    values:

      - SC.LAYOUT_VERTICAL
      - SC.LAYOUT_HORIZONTAL

    @type String
    @default SC.LAYOUT_VERTICAL
  */
  layoutDirection: SC.LAYOUT_VERTICAL,

  /**
    Whether or not the scroller should display scroll buttons

    @type Boolean
    @default YES
  */
  hasButtons: YES,


  // ..........................................................
  // DISPLAY METRICS
  //

  /**
    The width (if vertical scroller) or height (if horizontal scroller) of the
    scrollbar.

    @type Number
    @default 14
  */
  scrollbarThickness: 14,

  /**
    The width or height of the cap that encloses the track.

    @type Number
    @default 18
  */
  capLength: 18,

  /**
    The amount by which the thumb overlaps the cap.

    @type Number
    @default 14
  */
  capOverlap: 14,

  /**
    The width or height of the up/down or left/right arrow buttons. If the
    scroller is not displaying arrows, this is the width or height of the end
    cap.

    @type Number
    @defaut 41
  */
  buttonLength: 41,

  /**
    The amount by which the thumb overlaps the arrow buttons. If the scroller
    is not displaying arrows, this is the amount by which the thumb overlaps
    the end cap.

    @type Number
    @default 11
  */
  buttonOverlap: 11,

  /**
    The minimium length that the thumb will be, regardless of how much content
    is in the scroll view.

    @type Number
    @default 20
  */
  minimumThumbLength: 20,

  // ..........................................................
  // INTERNAL SUPPORT
  //


  /** @private
    Generates the HTML that gets displayed to the user.

    The first time render is called, the HTML will be output to the DOM.
    Successive calls will reposition the thumb based on the value property.

    @param {SC.RenderContext} context the render context
    @param {Boolean} firstTime YES if this is creating a layer
    @private
  */
  render: function(context, firstTime) {
    var ariaOrientation = 'vertical',
        classNames = {},
        buttons = '',
        parentView = this.get('parentView'),
        layoutDirection = this.get('layoutDirection'),
        thumbPosition, thumbLength, thumbCenterLength, thumbElement,
        value, max, scrollerLength, length, pct;

    // We set a class name depending on the layout direction so that we can
    // style them differently using CSS.
    switch (layoutDirection) {
      case SC.LAYOUT_VERTICAL:
        classNames['sc-vertical'] = YES;
        break;
      case SC.LAYOUT_HORIZONTAL:
        classNames['sc-horizontal'] = YES;
        ariaOrientation = 'horizontal';
        break;
    }

    // The appearance of the scroller changes if disabled
    // Whether to hide the thumb and buttons
    classNames['controls-hidden'] = this.get('controlsHidden');

    // Change the class names of the DOM element all at once to improve
    // performance
    context.setClass(classNames);

    // Calculate the position and size of the thumb
    thumbLength = this.get('thumbLength');
    thumbPosition = this.get('thumbPosition');

    // If this is the first time, generate the actual HTML
    if (firstTime) {
      context.push('<div class="track"></div>',
                    '<div class="cap"></div>');
      this.renderButtons(context, this.get('hasButtons'));
      this.renderThumb(context, layoutDirection, thumbLength, thumbPosition);

      //addressing accessibility
      context.setAttr('aria-orientation', ariaOrientation);

      //addressing accessibility
      context.setAttr('aria-valuemax', this.get('maximum'));
      context.setAttr('aria-valuemin', this.get('minimum'));
      context.setAttr('aria-valuenow', this.get('value'));
      context.setAttr('aria-controls' , parentView.getPath('contentView.layerId'));

    } else {
      // The HTML has already been generated, so all we have to do is
      // reposition and resize the thumb

      // If we aren't displaying controls don't bother
      if (this.get('controlsHidden')) return;

      thumbElement = this.$('.thumb');

      this.adjustThumb(thumbElement, thumbPosition, thumbLength);

      //addressing accessibility
      context.setAttr('aria-valuenow', this.get('value'));

    }
  },

  renderThumb: function(context, layoutDirection, thumbLength, thumbPosition) {
    var styleString;
    if(layoutDirection === SC.LAYOUT_HORIZONTAL) styleString = 'width: '+thumbLength+'px; left: ' + thumbPosition + 'px;';
    else styleString = 'height: '+thumbLength+'px; top: ' + thumbPosition + 'px;';

    context.push('<div class="thumb" style="%@">'.fmt(styleString),
                 '<div class="thumb-center"></div>',
                 '<div class="thumb-top"></div>',
                 '<div class="thumb-bottom"></div></div>');

  },

  renderButtons: function(context, hasButtons) {
    if (hasButtons) {
      context.push('<div class="button-bottom"></div><div class="button-top"></div>');
    } else {
      context.push('<div class="endcap"></div>');
    }
  },

  /** @private */
  touchScrollDidStart: function(value) {
    this.set("_touchScrollValue", value);
  },

  /** @private */
  touchScrollDidEnd: function(value) {
    SC.run(function () {
      this.set("_touchScrollValue", NO);
    }, this);
  },

  /* @private Internal property used to track the rate of touch scroll change events. */
  _lastTouchScrollTime: null,

  /** @private */
  touchScrollDidChange: function(value) {
    // Fast path!  Don't try to update too soon.
    if (Date.now() - this._lastTouchScrollTime < 30) { return; }

    // TODO: perform a raw update that doesn't require the run loop.
    SC.run(function () {
      this.set("_touchScrollValue", value);
    }, this);

    // Track the last time we updated.
    this._lastTouchScrollTime = Date.now();
  },

  // ..........................................................
  // THUMB MANAGEMENT
  //

  /** @private
    Adjusts the thumb (for backwards-compatibility calls adjustThumbPosition+adjustThumbSize by default)
  */
  adjustThumb: function(thumb, position, length) {
    this.adjustThumbPosition(thumb, position);
    this.adjustThumbSize(thumb, length);
  },

  /** @private
    Updates the position of the thumb DOM element.

    @param {Number} position the position of the thumb in pixels
  */
  adjustThumbPosition: function(thumb, position) {
    // Don't touch the DOM if the position hasn't changed
    if (this._thumbPosition === position) return;

    switch (this.get('layoutDirection')) {
      case SC.LAYOUT_VERTICAL:
        thumb.css('top', position);
        break;
      case SC.LAYOUT_HORIZONTAL:
        thumb.css('left', position);
        break;
    }

    this._thumbPosition = position;
  },

  /** @private */
  adjustThumbSize: function(thumb, size) {
    // Don't touch the DOM if the size hasn't changed
    if (this._thumbSize === size) return;

    switch (this.get('layoutDirection')) {
      case SC.LAYOUT_VERTICAL:
        thumb.css('height', Math.max(size, this.get('minimumThumbLength')));
        break;
      case SC.LAYOUT_HORIZONTAL:
        thumb.css('width', Math.max(size, this.get('minimumThumbLength')));
        break;
    }

    this._thumbSize = size;
  },

  // ..........................................................
  // SCROLLER DIMENSION COMPUTED PROPERTIES
  //

  /** @private
    Returns the total length of the track in which the thumb sits.

    The length of the track is the height or width of the scroller, less the
    cap length and the button length. This property is used to calculate the
    position of the thumb relative to the view.

    @property
  */
  trackLength: function() {
    var scrollerLength = this.get('scrollerLength');

    // Subtract the size of the top/left cap
    scrollerLength -= this.capLength - this.capOverlap;
    // Subtract the size of the scroll buttons, or the end cap if they are
    // not shown.
    scrollerLength -= this.buttonLength - this.buttonOverlap;

    return scrollerLength;
  }.property('scrollerLength').cacheable(),

  /** @private
    Returns the height of the view if this is a vertical scroller or the width
    of the view if this is a horizontal scroller. This is used when scrolling
    up and down by page, as well as in various layout calculations.

    @type Number
  */
  scrollerLength: function() {
    switch (this.get('layoutDirection')) {
      case SC.LAYOUT_VERTICAL:
        return this.get('frame').height;
      case SC.LAYOUT_HORIZONTAL:
        return this.get('frame').width;
    }

    return 0;
  }.property('frame').cacheable(),

  /** @private
    The total length of the thumb. The size of the thumb is the
    length of the track times the content proportion.

    @property
  */
  thumbLength: function() {
    var length;

    length = Math.floor(this.get('trackLength') * this.get('proportion'));
    length = isNaN(length) ? 0 : length;

    return Math.max(length, this.get('minimumThumbLength'));
  }.property('trackLength', 'proportion').cacheable(),

  /** @private
    The position of the thumb in the track.

    @type Number
    @isReadOnly
  */
  thumbPosition: function() {
    var value = this.get('displayValue'),
        max = this.get('maximum'),
        trackLength = this.get('trackLength'),
        thumbLength = this.get('thumbLength'),
        capLength = this.get('capLength'),
        capOverlap = this.get('capOverlap'), position;

    position = (value/max)*(trackLength-thumbLength);
    position += capLength - capOverlap; // account for the top/left cap

    return Math.floor(isNaN(position) ? 0 : position);
  }.property('displayValue', 'maximum', 'trackLength', 'thumbLength').cacheable(),

  /** @private
    YES if the maximum value exceeds the frame size of the scroller.  This
    will hide the thumb and buttons.

    @type Boolean
    @isReadOnly
  */
  controlsHidden: function() {
    return this.get('proportion') >= 1;
  }.property('proportion').cacheable(),


  // ..........................................................
  // MOUSE EVENTS
  //

  /** @private
    Returns the value for a position within the scroller's frame.
  */
  valueForPosition: function(pos) {
    var max = this.get('maximum'),
        trackLength = this.get('trackLength'),
        thumbLength = this.get('thumbLength'),
        capLength = this.get('capLength'),
        capOverlap = this.get('capOverlap'), value;

    value = pos - (capLength - capOverlap);
    value = value / (trackLength - thumbLength);
    value = value * max;
    return value;
  },

  /** @private
    Handles mouse down events and adjusts the value property depending where
    the user clicked.

    If the control is disabled, we ignore all mouse input.

    If the user clicks the thumb, we note the position of the mouse event but
    do not take further action until they begin to drag.

    If the user clicks the track, we adjust the value a page at a time, unless
    alt is pressed, in which case we scroll to that position.

    If the user clicks the buttons, we adjust the value by a fixed amount, unless
    alt is pressed, in which case we adjust by a page.

    If the user clicks and holds on either the track or buttons, those actions
    are repeated until they release the mouse button.

    @param evt {SC.Event} the mousedown event
  */
  mouseDown: function(evt) {
    if (!this.get('isEnabledInPane')) return NO;

    // keep note of altIsDown for later.
    this._altIsDown = evt.altKey;
    this._shiftIsDown = evt.shiftKey;

    var target = evt.target,
        thumbPosition = this.get('thumbPosition'),
        value, clickLocation, clickOffset,
        scrollerLength = this.get('scrollerLength');

    // Determine the subcontrol that was clicked
    if (target.className.indexOf('thumb') >= 0) {
      // Convert the mouseDown coordinates to the view's coordinates
      clickLocation = this.convertFrameFromView({ x: evt.pageX, y: evt.pageY });

      clickLocation.x -= thumbPosition;
      clickLocation.y -= thumbPosition;

      // Store the starting state so we know how much to adjust the
      // thumb when the user drags
      this._thumbDragging = YES;
      this._thumbOffset = clickLocation;
      this._mouseDownLocation = { x: evt.pageX, y: evt.pageY };
      this._thumbPositionAtDragStart = this.get('thumbPosition');
      this._valueAtDragStart = this.get("value");
    } else if (target.className.indexOf('button-top') >= 0) {
      // User clicked the up/left button
      // Decrement the value by a fixed amount or page size
      this.decrementProperty('value', (this._altIsDown ? scrollerLength : 30));
      this.makeButtonActive('.button-top');
      // start a timer that will continue to fire until mouseUp is called
      this.startMouseDownTimer('scrollUp');
      this._isScrollingUp = YES;
    } else if (target.className.indexOf('button-bottom') >= 0) {
      // User clicked the down/right button
      // Increment the value by a fixed amount
      this.incrementProperty('value', (this._altIsDown ? scrollerLength : 30));
      this.makeButtonActive('.button-bottom');
      // start a timer that will continue to fire until mouseUp is called
      this.startMouseDownTimer('scrollDown');
      this._isScrollingDown = YES;
    } else {
      // User clicked in the track
      var scrollToClick = this.get("shouldScrollToClick");
      if (evt.altKey) scrollToClick = !scrollToClick;

      var trackLength = this.get('trackLength'),
          thumbLength = this.get('thumbLength'),
          frame = this.convertFrameFromView({ x: evt.pageX, y: evt.pageY }),
          mousePosition;

      switch (this.get('layoutDirection')) {
        case SC.LAYOUT_VERTICAL:
          this._mouseDownLocation = mousePosition = frame.y;
          break;
        case SC.LAYOUT_HORIZONTAL:
          this._mouseDownLocation = mousePosition = frame.x;
          break;
      }

      if (scrollToClick) {
        this.set('value', this.valueForPosition(mousePosition - (thumbLength / 2)));

        // and start a normal mouse down
        thumbPosition = this.get('thumbPosition');

        this._thumbDragging = YES;
        this._thumbOffset = {x: frame.x - thumbPosition, y: frame.y - thumbPosition };
        this._mouseDownLocation = {x:evt.pageX, y:evt.pageY};
        this._thumbPositionAtDragStart = thumbPosition;
        this._valueAtDragStart = this.get("value");
      } else {
        // Move the thumb up or down a page depending on whether the click
        // was above or below the thumb
        if (mousePosition < thumbPosition) {
          this.decrementProperty('value',scrollerLength);
          this.startMouseDownTimer('page');
        } else {
          this.incrementProperty('value', scrollerLength);
          this.startMouseDownTimer('page');
        }
      }

    }

    return YES;
  },

  /** @private
    When the user releases the mouse button, remove any active
    state from the button controls, and cancel any outstanding
    timers.

    @param evt {SC.Event} the mousedown event
  */
  mouseUp: function(evt) {
    var active = this._scs_buttonActive, ret = NO, timer;

    // If we have an element that was set as active in mouseDown,
    // remove its active state
    if (active) {
      active.removeClass('active');
      ret = YES;
    }

    // Stop firing repeating events after mouseup
    timer = this._mouseDownTimer;
    if (timer) {
      timer.invalidate();
      this._mouseDownTimer = null;
    }

    this._thumbDragging = NO;
    this._isScrollingDown = NO;
    this._isScrollingUp = NO;

    return ret;
  },

  /** @private
    If the user began the drag on the thumb, we calculate the difference
    between the mouse position at click and where it is now.  We then
    offset the thumb by that amount, within the bounds of the track.

    If the user began scrolling up/down using the buttons, this will track
    what component they are currently over, changing the scroll direction.

    @param evt {SC.Event} the mousedragged event
  */
  mouseDragged: function(evt) {
    if (!this.get('isEnabledInPane')) return NO;

    var value, length, delta, thumbPosition,
        target = evt.target,
        thumbPositionAtDragStart = this._thumbPositionAtDragStart,
        isScrollingUp = this._isScrollingUp,
        isScrollingDown = this._isScrollingDown,
        active = this._scs_buttonActive,
        timer;

    // Only move the thumb if the user clicked on the thumb during mouseDown
    if (this._thumbDragging) {

      switch (this.get('layoutDirection')) {
        case SC.LAYOUT_VERTICAL:
          delta = (evt.pageY - this._mouseDownLocation.y);
          break;
        case SC.LAYOUT_HORIZONTAL:
          delta = (evt.pageX - this._mouseDownLocation.x);
          break;
      }

      // if we are in alt now, but were not before, update the old thumb position to the new one
      if (evt.altKey) {
        if (!this._altIsDown || (this._shiftIsDown !== evt.shiftKey)) {
          thumbPositionAtDragStart = this._thumbPositionAtDragStart = thumbPositionAtDragStart+delta;
          delta = 0;
          this._mouseDownLocation = { x: evt.pageX, y: evt.pageY };
          this._valueAtDragStart = this.get("value");
        }

        // because I feel like it. Probably almost no one will find this tiny, buried feature.
        // Too bad.
        if (evt.shiftKey) delta = -delta;

        this.set('value', Math.round(this._valueAtDragStart + delta * 2));
      } else {
        thumbPosition = thumbPositionAtDragStart + delta;
        length = this.get('trackLength') - this.get('thumbLength');
        this.set('value', Math.round( (thumbPosition/length) * this.get('maximum')));
      }

    } else if (isScrollingUp || isScrollingDown) {
      var nowScrollingUp = NO, nowScrollingDown = NO;

      var topButtonRect = this.$('.button-top')[0].getBoundingClientRect();
      var bottomButtonRect = this.$('.button-bottom')[0].getBoundingClientRect();

      switch (this.get('layoutDirection')) {
        case SC.LAYOUT_VERTICAL:
          if (evt.clientY < topButtonRect.bottom) nowScrollingUp = YES;
          else nowScrollingDown = YES;
          break;
        case SC.LAYOUT_HORIZONTAL:
          if (evt.clientX < topButtonRect.right) nowScrollingUp = YES;
          else nowScrollingDown = YES;
          break;
      }

      if ((nowScrollingUp || nowScrollingDown) && nowScrollingUp !== isScrollingUp){
        //
        // STOP OLD
        //

        // If we have an element that was set as active in mouseDown,
        // remove its active state
        if (active) {
         active.removeClass('active');
        }

        // Stop firing repeating events after mouseup
        this._mouseDownTimerAction = nowScrollingUp ? "scrollUp" : "scrollDown";

        if (nowScrollingUp) {
          this.makeButtonActive('.button-top');
        } else if (nowScrollingDown) {
          this.makeButtonActive('.button-bottom');
        }

         this._isScrollingUp = nowScrollingUp;
         this._isScrollingDown = nowScrollingDown;
      }
    }


    this._altIsDown = evt.altKey;
    this._shiftIsDown = evt.shiftKey;
    return YES;
  },

  /** @private
    Starts a timer that fires after 300ms.  This is called when the user
    clicks a button or inside the track to move a page at a time. If they
    continue holding the mouse button down, we want to repeat that action
    after a small delay.  This timer will be invalidated in mouseUp.

    Specify "immediate" as YES if it should not wait.
  */
  startMouseDownTimer: function(action, immediate) {
    var timer;

    this._mouseDownTimerAction = action;
    this._mouseDownTimer = SC.Timer.schedule({
      target: this, action: this.mouseDownTimerDidFire, interval: immediate ? 0 : 300
    });
  },

  /** @private
    Called by the mousedown timer.  This method determines the initial
    user action and repeats it until the timer is invalidated in mouseUp.
  */
  mouseDownTimerDidFire: function() {
    var scrollerLength = this.get('scrollerLength'),
        mouseLocation = SC.device.get('mouseLocation'),
        thumbPosition = this.get('thumbPosition'),
        thumbLength = this.get('thumbLength'),
        timerInterval = 50;

    switch (this.get('layoutDirection')) {
      case SC.LAYOUT_VERTICAL:
        mouseLocation = this.convertFrameFromView(mouseLocation).y;
        break;
      case SC.LAYOUT_HORIZONTAL:
        mouseLocation = this.convertFrameFromView(mouseLocation).x;
        break;
    }

    switch (this._mouseDownTimerAction) {
      case 'scrollDown':
        this.incrementProperty('value', this._altIsDown ? scrollerLength : 30);
        break;
      case 'scrollUp':
        this.decrementProperty('value', this._altIsDown ? scrollerLength : 30);
        break;
      case 'page':
        timerInterval = 150;
        if (mouseLocation < thumbPosition) {
          this.decrementProperty('value', scrollerLength);
        } else if (mouseLocation > thumbPosition+thumbLength) {
          this.incrementProperty('value', scrollerLength);
        }
    }

    this._mouseDownTimer = SC.Timer.schedule({
      target: this, action: this.mouseDownTimerDidFire, interval: timerInterval
    });
  },

  /** @private
    Given a selector, finds the corresponding DOM element and adds
    the 'active' class name.  Also stores the returned element so that
    the 'active' class name can be removed during mouseup.

    @param {String} the selector to find
  */
  makeButtonActive: function(selector) {
    this._scs_buttonActive = this.$(selector).addClass('active');
  }
});

// TODO: Use render delegates to handle rendering.

/**
  @class
  @extends SC.ScrollerView
*/
SC.TouchScrollerView = SC.ScrollerView.extend(
/** @scope SC.TouchScrollerView.prototype */{

  /**
    @type Array
    @default ['sc-touch-scroller-view']
    @see SC.View#classNames
  */
  classNames: ['sc-touch-scroller-view'],

  /**
    @type Number
    @default 12
  */
  scrollbarThickness: 12,

  /**
    @type Number
    @default 5
  */
  capLength: 5,

  /**
    @type Number
    @default 0
  */
  capOverlap: 0,

  /**
    @type Boolean
    @default NO
  */
  hasButtons: NO,

  /**
    @type Number
    @default 36
  */
  buttonOverlap: 36,

  /** @private */
  adjustThumb: function(thumb, position, length) {
    var thumbInner = this.$('.thumb-inner');
    var max = this.get("scrollerLength") - this.capLength, min = this.get("minimum") + this.capLength;

    if (position + length > max) {
      position = Math.min(max - 20, position);
      length = max - position;
    }

    if (position < min) {
      length -= min - position;
      position = min;
    }

    switch (this.get('layoutDirection')) {
      case SC.LAYOUT_VERTICAL:
        if (this._thumbPosition !== position) thumb.css('-webkit-transform', 'translate3d(0px,' + position + 'px,0px)');
        if (this._thumbSize !== length) {
          thumbInner.css('-webkit-transform', 'translate3d(0px,' + Math.round(length - 1044) + 'px,0px)');
        }
        break;
      case SC.LAYOUT_HORIZONTAL:
        if (this._thumbPosition !== position) thumb.css('-webkit-transform', 'translate3d(' + position + 'px,0px,0px)');
        if (this._thumbSize !== length) {
          thumbInner.css('-webkit-transform', 'translate3d(' + Math.round(length - 1044) + 'px,0px,0px)');
        }
        break;
    }

    this._thumbPosition = position;
    this._thumbSize = length;
  },

  /** @private */
  render: function(context, firstTime) {
    var classNames = [],
        thumbPosition, thumbLength, thumbCenterLength, thumbElement,
        value, max, scrollerLength, length, pct;

    // We set a class name depending on the layout direction so that we can
    // style them differently using CSS.
    switch (this.get('layoutDirection')) {
      case SC.LAYOUT_VERTICAL:
        classNames.push('sc-vertical');
        break;
      case SC.LAYOUT_HORIZONTAL:
        classNames.push('sc-horizontal');
        break;
    }

    // Whether to hide the thumb and buttons
    if (this.get('controlsHidden')) classNames.push('controls-hidden');

    // Change the class names of the DOM element all at once to improve
    // performance
    context.addClass(classNames);

    // Calculate the position and size of the thumb
    thumbLength = this.get('thumbLength');
    thumbPosition = this.get('thumbPosition');

    // If this is the first time, generate the actual HTML
    if (firstTime) {
      context.push('<div class="track"></div>'+
                    '<div class="cap"></div>');
      this.renderButtons(context, this.get('hasButtons'));
      this.renderThumb(context, this.get('layoutDirection'), thumbLength);
    }

    else {
      // The HTML has already been generated, so all we have to do is
      // reposition and resize the thumb

      // If we aren't displaying controls don't bother
      if (this.get('controlsHidden')) return;

      thumbElement = this.$('.thumb');

      this.adjustThumb(thumbElement, thumbPosition, thumbLength);
    }
  },

  renderThumb: function(context, layoutDirection, thumbLength) {
    // where is this magic number from?
    thumbLength -= 1044;
    layoutDirection = (layoutDirection === SC.LAYOUT_HORIZONTAL ? 'X' : 'Y');

    context.push('<div class="thumb">'+
                 '<div class="thumb-top"></div>'+
                 '<div class="thumb-clip">'+
                 '<div class="thumb-inner" style="-webkit-transform: translate%@(%@px);">'.fmt(layoutDirection, thumbLength)+
                 '<div class="thumb-center"></div>'+
                 '<div class="thumb-bottom"></div></div></div></div>');

  }
});

/* >>>>>>>>>> BEGIN source/views/scroll.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('views/scroller');

/**
  @static
  @type Number
  @default 0.95
*/
SC.NORMAL_SCROLL_DECELERATION = 0.95;

/**
  @static
  @type Number
  @default 0.85
*/
SC.FAST_SCROLL_DECELERATION = 0.85;

/** @class
  Implements a complete scroll view.  This class uses a manual implementation
  of scrollers in order to properly support clipping frames.

  Important Events:

    - contentView frame size changes (to autoshow/hide scrollbar - adjust scrollbar size)
    - horizontalScrollOffset change
    - verticalScrollOffsetChanges
    - scroll wheel events

  @extends SC.View
  @since SproutCore 1.0
*/
SC.ScrollView = SC.View.extend({
/** @scope SC.ScrollView.prototype */

  /**
    @type Array
    @default ['sc-scroll-view']
    @see SC.View#classNames
  */
  classNames: ['sc-scroll-view'],

  // ..........................................................
  // PROPERTIES
  //

  /**
    Walk like a duck

    @type Boolean
    @default YES
    @readOnly
  */
  isScrollable: YES,

  /**
    The content view you want the scroll view to manage. This will be assigned to the contentView of the clipView also.

    @type SC.View
    @default null
  */
  contentView: null,

  /**
    The horizontal alignment for non-filling content inside of the ScrollView. Possible values:

      - SC.ALIGN_LEFT
      - SC.ALIGN_RIGHT
      - SC.ALIGN_CENTER

    @type String
    @default SC.ALIGN_LEFT
  */
  horizontalAlign: SC.ALIGN_LEFT,

  /**
    The vertical alignment for non-filling content inside of the ScrollView. Possible values:

      - SC.ALIGN_TOP
      - SC.ALIGN_BOTTOM
      - SC.ALIGN_MIDDLE

    @type String
    @default SC.ALIGN_TOP
  */
  verticalAlign: SC.ALIGN_TOP,

  /**
    The current horizontal scroll offset. Changing this value will update both the contentView and the horizontal scroller, if there is one.

    @field
    @type Number
    @default 0
  */
  horizontalScrollOffset: function (key, value) {
    if (value !== undefined) {
      var minOffset = this.minimumHorizontalScrollOffset(),
          maxOffset = this.get('maximumHorizontalScrollOffset');
      this._scroll_horizontalScrollOffset = Math.max(minOffset, Math.min(maxOffset, value));
    }

    return this._scroll_horizontalScrollOffset || 0;
  }.property().cacheable(),

  /**
    The current vertical scroll offset.  Changing this value will update both the contentView and the vertical scroller, if there is one.

    @field
    @type Number
    @default 0
  */
  verticalScrollOffset: function (key, value) {
    if (value !== undefined) {
      var minOffset = this.get('minimumVerticalScrollOffset'),
          maxOffset = this.get('maximumVerticalScrollOffset');
      this._scroll_verticalScrollOffset = Math.max(minOffset, Math.min(maxOffset, value));
    }

    return this._scroll_verticalScrollOffset || 0;
  }.property().cacheable(),

  /** @private
    Calculates the maximum offset given content and container sizes, and the
    alignment.
  */
  maximumScrollOffset: function (contentSize, containerSize, align) {
    // if our content size is larger than or the same size as the container, it's quite
    // simple to calculate the answer. Otherwise, we need to do some fancy-pants
    // alignment logic (read: simple math)
    if (contentSize >= containerSize) return contentSize - containerSize;

    // alignment, yeah
    if (align === SC.ALIGN_LEFT || align === SC.ALIGN_TOP) {
      // if we left-align something, and it is smaller than the view, does that not mean
      // that it's maximum (and minimum) offset is 0, because it should be positioned at 0?
      return 0;
    } else if (align === SC.ALIGN_MIDDLE || align === SC.ALIGN_CENTER) {
      // middle align means the difference divided by two, because we want equal parts on each side.
      return 0 - Math.round((containerSize - contentSize) / 2);
    } else {
      // right align means the entire difference, because we want all that space on the left
      return 0 - (containerSize - contentSize);
    }
  },

  /** @private
    Calculates the minimum offset given content and container sizes, and the
    alignment.
  */
  minimumScrollOffset: function (contentSize, containerSize, align) {
    // if the content is larger than the container, we have no need to change the minimum
    // away from the natural 0 position.
    if (contentSize > containerSize) return 0;

    // alignment, yeah
    if (align === SC.ALIGN_LEFT || align === SC.ALIGN_TOP) {
      // if we left-align something, and it is smaller than the view, does that not mean
      // that it's maximum (and minimum) offset is 0, because it should be positioned at 0?
      return 0;
    } else if (align === SC.ALIGN_MIDDLE || align === SC.ALIGN_CENTER) {
      // middle align means the difference divided by two, because we want equal parts on each side.
      return 0 - Math.round((containerSize - contentSize) / 2);
    } else {
      // right align means the entire difference, because we want all that space on the left
      return 0 - (containerSize - contentSize);
    }
  },

  /**
    The maximum horizontal scroll offset allowed given the current contentView
    size and the size of the scroll view.  If horizontal scrolling is
    disabled, this will always return 0.

    @field
    @type Number
    @default 0
  */
  maximumHorizontalScrollOffset: function () {
    var view = this.get('contentView');
    var contentWidth = view ? view.get('frame').width : 0,
        calculatedWidth = view ? view.get('calculatedWidth') : 0;

    // The following code checks if there is a calculatedWidth (collections)
    // to avoid looking at the incorrect value calculated by frame.
    if (calculatedWidth) {
      contentWidth = view.calculatedWidth;
    }
    contentWidth *= this._scale;

    var containerWidth = this.get('containerView').get('frame').width;

    // we still must go through minimumScrollOffset even if we can't scroll
    // because we need to adjust for alignment. So, just make sure it won't allow scrolling.
    if (!this.get('canScrollHorizontal')) contentWidth = Math.min(contentWidth, containerWidth);
    return this.maximumScrollOffset(contentWidth, containerWidth, this.get("horizontalAlign"));
  }.property(),

  /**
    The maximum vertical scroll offset allowed given the current contentView
    size and the size of the scroll view.  If vertical scrolling is disabled,
    this will always return 0 (or whatever alignment dictates).

    @field
    @type Number
    @default 0
  */
  maximumVerticalScrollOffset: function () {
    var view = this.get('contentView'),
        contentHeight = (view && view.get('frame')) ? view.get('frame').height : 0,
        calculatedHeight = view ? view.get('calculatedHeight') : 0;

    // The following code checks if there is a calculatedWidth (collections)
    // to avoid looking at the incorrect value calculated by frame.
    if (calculatedHeight) {
      contentHeight = calculatedHeight;
    }
    contentHeight *= this._scale;

    var containerHeight = this.get('containerView').get('frame').height;

    // we still must go through minimumScrollOffset even if we can't scroll
    // because we need to adjust for alignment. So, just make sure it won't allow scrolling.
    if (!this.get('canScrollVertical')) contentHeight = Math.min(contentHeight, containerHeight);
    return this.maximumScrollOffset(contentHeight, containerHeight, this.get("verticalAlign"));
  }.property(),


  /**
    The minimum horizontal scroll offset allowed given the current contentView
    size and the size of the scroll view.  If horizontal scrolling is
    disabled, this will always return 0 (or whatever alignment dictates).

    @field
    @type Number
    @default 0
  */
  minimumHorizontalScrollOffset: function () {
    var view = this.get('contentView');
    var contentWidth = view ? view.get('frame').width : 0,
        calculatedWidth = view ? view.get('calculatedWidth') : 0;
    // The following code checks if there is a calculatedWidth (collections)
    // to avoid looking at the incorrect value calculated by frame.
    if (calculatedWidth) {
      contentWidth = calculatedWidth;
    }
    contentWidth *= this._scale;

    var containerWidth = this.get('containerView').get('frame').width;

    // we still must go through minimumScrollOffset even if we can't scroll
    // because we need to adjust for alignment. So, just make sure it won't allow scrolling.
    if (!this.get('canScrollHorizontal')) contentWidth = Math.min(contentWidth, containerWidth);
    return this.minimumScrollOffset(contentWidth, containerWidth, this.get("horizontalAlign"));
  }.property(),

  /**
    The minimum vertical scroll offset allowed given the current contentView
    size and the size of the scroll view.  If vertical scrolling is disabled,
    this will always return 0 (or whatever alignment dictates).

    @field
    @type Number
    @default 0
  */
  minimumVerticalScrollOffset: function () {
    var view = this.get('contentView');
    var contentHeight = (view && view.get('frame')) ? view.get('frame').height : 0,
        calculatedHeight = view ? view.get('calculatedHeight') : 0;

    // The following code checks if there is a calculatedWidth (collections)
    // to avoid looking at the incorrect value calculated by frame.
    if (calculatedHeight) {
      contentHeight = view.calculatedHeight;
    }
    contentHeight *= this._scale;

    var containerHeight = this.get('containerView').get('frame').height;

    // we still must go through minimumScrollOffset even if we can't scroll
    // because we need to adjust for alignment. So, just make sure it won't allow scrolling.
    if (!this.get('canScrollVertical')) contentHeight = Math.min(contentHeight, containerHeight);
    return this.minimumScrollOffset(contentHeight, containerHeight, this.get("verticalAlign"));
  }.property(),


  /**
    Amount to scroll one vertical line.

    Used by the default implementation of scrollDownLine() and scrollUpLine().

    @type Number
    @default 20
  */
  verticalLineScroll: 20,

  /**
    Amount to scroll one horizontal line.

    Used by the default implementation of scrollLeftLine() and
    scrollRightLine().

    @type Number
    @default 20
  */
  horizontalLineScroll: 20,

  /**
    Amount to scroll one vertical page.

    Used by the default implementation of scrollUpPage() and scrollDownPage().

    @field
    @type Number
    @default value of frame.height
    @observes frame
  */
  verticalPageScroll: function () {
    return this.get('frame').height;
  }.property('frame'),

  /**
    Amount to scroll one horizontal page.

    Used by the default implementation of scrollLeftPage() and
    scrollRightPage().

    @field
    @type Number
    @default value of frame.width
    @observes frame
  */
  horizontalPageScroll: function () {
    return this.get('frame').width;
  }.property('frame'),


  // ..........................................................
  // SCROLLERS
  //

  /**
    YES if the view should maintain a horizontal scroller.   This property
    must be set when the view is created.

    @type Boolean
    @default YES
  */
  hasHorizontalScroller: YES,

  /**
    The horizontal scroller view class. This will be replaced with a view
    instance when the ScrollView is created unless hasHorizontalScroller is
    NO.

    @type SC.View
    @default SC.ScrollerView
  */
  horizontalScrollerView: SC.ScrollerView,

  /**
    The horizontal scroller view for touch. This will be replaced with a view
    instance when touch is enabled when the ScrollView is created unless
    hasHorizontalScroller is NO.

    @type SC.View
    @default SC.TouchScrollerView
  */
  horizontalTouchScrollerView: SC.TouchScrollerView,

  /**
    YES if the horizontal scroller should be visible.  You can change this
    property value anytime to show or hide the horizontal scroller.  If you
    do not want to use a horizontal scroller at all, you should instead set
    hasHorizontalScroller to NO to avoid creating a scroller view in the
    first place.

    @type Boolean
    @default YES
  */
  isHorizontalScrollerVisible: YES,

  /**
    Returns YES if the view both has a horizontal scroller, the scroller is
    visible.

    @field
    @type Boolean
    @default YES
  */
  canScrollHorizontal: function () {
    return !!(this.get('hasHorizontalScroller') &&
      this.get('horizontalScrollerView') &&
      this.get('isHorizontalScrollerVisible'));
  }.property('isHorizontalScrollerVisible').cacheable(),

  /**
    If YES, the horizontal scroller will autohide if the contentView is
    smaller than the visible area.  You must set hasHorizontalScroller to YES
    for this property to have any effect.

    @type Boolean
    @default YES
  */
  autohidesHorizontalScroller: YES,

  /**
    YES if the view should maintain a vertical scroller.   This property must
    be set when the view is created.

    @type Boolean
    @default YES
  */
  hasVerticalScroller: YES,

  /**
    The vertical scroller view class. This will be replaced with a view
    instance when the ScrollView is created unless hasVerticalScroller is NO.

    @type SC.View
    @default SC.ScrollerView
  */
  verticalScrollerView: SC.ScrollerView,

  /**
    The vertical touch scroller view class. This will be replaced with a view
    instance when the ScrollView is created.

    @type SC.View
    @default SC.TouchScrollerView
  */
  verticalTouchScrollerView: SC.TouchScrollerView,

  /**
    YES if the vertical scroller should be visible.  You can change this
    property value anytime to show or hide the vertical scroller.  If you do
    not want to use a vertical scroller at all, you should instead set
    hasVerticalScroller to NO to avoid creating a scroller view in the first
    place.

    @type Boolean
    @default YES
  */
  isVerticalScrollerVisible: YES,

  /**
    Returns YES if the view both has a horizontal scroller, the scroller is
    visible.

    @field
    @type Boolean
    @default YES
  */
  canScrollVertical: function () {
    return !!(this.get('hasVerticalScroller') &&
      this.get('verticalScrollerView') &&
      this.get('isVerticalScrollerVisible'));
  }.property('isVerticalScrollerVisible').cacheable(),

  /**
    If YES, the vertical scroller will autohide if the contentView is
    smaller than the visible area.  You must set hasVerticalScroller to YES
    for this property to have any effect.

    @type Boolean
    @default YES
  */
  autohidesVerticalScroller: YES,

  /**
    Use this property to set the 'bottom' offset of your vertical scroller,
    to make room for a thumb view or other accessory view. Default is 0.

    @type Number
    @default 0
  */
  verticalScrollerBottom: 0,

  /**
    Use this to overlay the vertical scroller.

    This ensures that the container frame will not resize to accommodate the
    vertical scroller, hence overlaying the scroller on top of
    the container.

    @field
    @type Boolean
    @default NO
  */
  verticalOverlay: function () {
    if (SC.platform.touch) return YES;
    return NO;
  }.property().cacheable(),

  /**
    Use this to overlay the horizontal scroller.

    This ensures that the container frame will not resize to accommodate the
    horizontal scroller, hence overlaying the scroller on top of
    the container

    @field
    @type Boolean
    @default NO
  */
  horizontalOverlay: function () {
    if (SC.platform.touch) return YES;
    return NO;
  }.property().cacheable(),

  /**
    Use to control the positioning of the vertical scroller.  If you do not
    set 'verticalOverlay' to YES, then the content view will be automatically
    sized to meet the left edge of the vertical scroller, wherever it may be.
    This allows you to easily, for example, have “one pixel higher and one
    pixel lower” scroll bars that blend into their parent views.

    If you do set 'verticalOverlay' to YES, then the scroller view will
    “float on top” of the content view.

    Example: { top: -1, bottom: -1, right: 0 }

    @type Hash
    @default null
  */
  verticalScrollerLayout: null,

  /**
    Use to control the positioning of the horizontal scroller.  If you do not
    set 'horizontalOverlay' to YES, then the content view will be
    automatically sized to meet the top edge of the horizontal scroller,
    wherever it may be.

    If you do set 'horizontalOverlay' to YES, then the scroller view will
    “float on top” of the content view.

    Example: { left: 0, bottom: 0, right: 0 }

    @type Hash
    @default null
  */
  horizontalScrollerLayout: null,

  // ..........................................................
  // CUSTOM VIEWS
  //

  /**
    The container view that will contain your main content view.  You can
    replace this property with your own custom subclass if you prefer.

    @type SC.ContainerView
    @default SC.ConainerView
  */
  containerView: SC.ContainerView.extend({}),


  // ..........................................................
  // METHODS
  //

  /**
    Scrolls the receiver to the specified x,y coordinate.  This should be the
    offset into the contentView you want to appear at the top-left corner of
    the scroll view.

    This method will contain the actual scroll based on whether the view
    can scroll in the named direction and the maximum distance it can
    scroll.

    If you only want to scroll in one direction, pass null for the other
    direction.  You can also optionally pass a Hash for the first parameter
    with x and y coordinates.

    @param {Number} x the x scroll location
    @param {Number} y the y scroll location
    @returns {SC.ScrollView} receiver
  */
  scrollTo: function (x, y) {
    // normalize params
    if (y === undefined && SC.typeOf(x) === SC.T_HASH) {
      y = x.y;
      x = x.x;
    }

    if (!SC.none(x)) {
      this.set('horizontalScrollOffset', x);
    }

    if (!SC.none(y)) {
      this.set('verticalScrollOffset', y);
    }

    return this;
  },

  /**
    Scrolls the receiver in the horizontal and vertical directions by the
    amount specified, if allowed.  The actual scroll amount will be
    constrained by the current scroll view settings.

    If you only want to scroll in one direction, pass null or 0 for the other
    direction.  You can also optionally pass a Hash for the first parameter
    with x and y coordinates.

    @param {Number} x change in the x direction (or hash)
    @param {Number} y change in the y direction
    @returns {SC.ScrollView} receiver
  */
  scrollBy: function (x, y) {
    // normalize params
    if (y === undefined && SC.typeOf(x) === SC.T_HASH) {
      y = x.y;
      x = x.x;
    }

    // if null, undefined, or 0, pass null; otherwise just add current offset
    x = (x) ? this.get('horizontalScrollOffset') + x : null;
    y = (y) ? this.get('verticalScrollOffset') + y : null;
    return this.scrollTo(x, y);
  },

  /**
    Scroll the view to make the view's frame visible.  For this to make sense,
    the view should be a subview of the contentView.  Otherwise the results
    will be undefined.

    @param {SC.View} view view to scroll or null to scroll receiver visible
    @returns {Boolean} YES if scroll position was changed
  */
  scrollToVisible: function (view) {

    // if no view is passed, do default
    if (arguments.length === 0) return arguments.callee.base.apply(this,arguments);

    var contentView = this.get('contentView');
    if (!contentView) return NO; // nothing to do if no contentView.

    // get the frame for the view - should work even for views with static
    // layout, assuming it has been added to the screen.
    var vf = view.get('frame');
    if (!vf) return NO; // nothing to do

    // convert view's frame to an offset from the contentView origin.  This
    // will become the new scroll offset after some adjustment.
    vf = contentView.convertFrameFromView(vf, view.get('parentView'));

    return this.scrollToRect(vf);
  },

  /**
    Scroll to the supplied rectangle.
    @param {Rect} rect Rectangle to scroll to.
    @returns {Boolean} YES if scroll position was changed.
  */
  scrollToRect: function (rect) {
    // find current visible frame.
    var vo = SC.cloneRect(this.get('containerView').get('frame'));

    vo.x = this.get('horizontalScrollOffset');
    vo.y = this.get('verticalScrollOffset');

    var origX = vo.x, origY = vo.y;

    // if top edge is not visible, shift origin
    vo.y -= Math.max(0, SC.minY(vo) - SC.minY(rect));
    vo.x -= Math.max(0, SC.minX(vo) - SC.minX(rect));

    // if bottom edge is not visible, shift origin
    vo.y += Math.max(0, SC.maxY(rect) - SC.maxY(vo));
    vo.x += Math.max(0, SC.maxX(rect) - SC.maxX(vo));

    // scroll to that origin.
    if ((origX !== vo.x) || (origY !== vo.y)) {
      this.scrollTo(vo.x, vo.y);
      return YES;
    } else return NO;
  },


  /**
    Scrolls the receiver down one or more lines if allowed.  If number of
    lines is not specified, scrolls one line.

    @param {Number} lines number of lines
    @returns {SC.ScrollView} receiver
  */
  scrollDownLine: function (lines) {
    if (lines === undefined) lines = 1;
    return this.scrollBy(null, this.get('verticalLineScroll') * lines);
  },

  /**
    Scrolls the receiver up one or more lines if allowed.  If number of
    lines is not specified, scrolls one line.

    @param {Number} lines number of lines
    @returns {SC.ScrollView} receiver
  */
  scrollUpLine: function (lines) {
    if (lines === undefined) lines = 1;
    return this.scrollBy(null, 0 - this.get('verticalLineScroll') * lines);
  },

  /**
    Scrolls the receiver right one or more lines if allowed.  If number of
    lines is not specified, scrolls one line.

    @param {Number} lines number of lines
    @returns {SC.ScrollView} receiver
  */
  scrollRightLine: function (lines) {
    if (lines === undefined) lines = 1;
    return this.scrollTo(this.get('horizontalLineScroll') * lines, null);
  },

  /**
    Scrolls the receiver left one or more lines if allowed.  If number of
    lines is not specified, scrolls one line.

    @param {Number} lines number of lines
    @returns {SC.ScrollView} receiver
  */
  scrollLeftLine: function (lines) {
    if (lines === undefined) lines = 1;
    return this.scrollTo(0 - this.get('horizontalLineScroll') * lines, null);
  },

  /**
    Scrolls the receiver down one or more page if allowed.  If number of
    pages is not specified, scrolls one page.  The page size is determined by
    the verticalPageScroll value.  By default this is the size of the current
    scrollable area.

    @param {Number} pages number of lines
    @returns {SC.ScrollView} receiver
  */
  scrollDownPage: function (pages) {
    if (pages === undefined) pages = 1;
    return this.scrollBy(null, this.get('verticalPageScroll') * pages);
  },

  /**
    Scrolls the receiver up one or more page if allowed.  If number of
    pages is not specified, scrolls one page.  The page size is determined by
    the verticalPageScroll value.  By default this is the size of the current
    scrollable area.

    @param {Number} pages number of lines
    @returns {SC.ScrollView} receiver
  */
  scrollUpPage: function (pages) {
    if (pages === undefined) pages = 1;
    return this.scrollBy(null, 0 - (this.get('verticalPageScroll') * pages));
  },

  /**
    Scrolls the receiver right one or more page if allowed.  If number of
    pages is not specified, scrolls one page.  The page size is determined by
    the verticalPageScroll value.  By default this is the size of the current
    scrollable area.

    @param {Number} pages number of lines
    @returns {SC.ScrollView} receiver
  */
  scrollRightPage: function (pages) {
    if (pages === undefined) pages = 1;
    return this.scrollBy(this.get('horizontalPageScroll') * pages, null);
  },

  /**
    Scrolls the receiver left one or more page if allowed.  If number of
    pages is not specified, scrolls one page.  The page size is determined by
    the verticalPageScroll value.  By default this is the size of the current
    scrollable area.

    @param {Number} pages number of lines
    @returns {SC.ScrollView} receiver
  */
  scrollLeftPage: function (pages) {
    if (pages === undefined) pages = 1;
    return this.scrollBy(0 - (this.get('horizontalPageScroll') * pages), null);
  },

  /** @private
    Adjusts the layout for the various internal views.  This method is called
    once when the scroll view is first configured and then anytime a scroller
    is shown or hidden.  You can call this method yourself as well to retile.

    You may also want to override this method to handle layout for any
    additional controls you have added to the view.
  */
  tile: function () {
    // get horizontal scroller/determine if we should have a scroller
    var hscroll = this.get('hasHorizontalScroller') ? this.get('horizontalScrollerView') : null;
    var hasHorizontal = hscroll && this.get('isHorizontalScrollerVisible');

    // get vertical scroller/determine if we should have a scroller
    var vscroll = this.get('hasVerticalScroller') ? this.get('verticalScrollerView') : null;
    var hasVertical = vscroll && this.get('isVerticalScrollerVisible');

    // get the containerView
    var clip = this.get('containerView');
    var clipLayout = { left: 0, top: 0 };
    var layout, vo, ho, vl, hl;

    var ht = ((hasHorizontal) ? hscroll.get('scrollbarThickness') : 0);
    var vt = (hasVertical) ?   vscroll.get('scrollbarThickness') : 0;

    if (hasHorizontal) {
      hl = this.get('horizontalScrollerLayout');
      layout = {
        left: (hl ? hl.left : 0),
        bottom: (hl ? hl.bottom : 0),
        right: (hl ? hl.right + vt - 1 : vt - 1),
        height: ht
      };
      hscroll.set('layout', layout);
      ho = this.get('horizontalOverlay');
      clipLayout.bottom = ho ? 0 : (layout.bottom + ht);
    } else {
      clipLayout.bottom = 0;
    }
    if (hscroll) hscroll.set('isVisible', hasHorizontal);

    if (hasVertical) {
      ht     = ht + this.get('verticalScrollerBottom');
      vl     = this.get('verticalScrollerLayout');
      layout = {
        top: (vl ? vl.top : 0),
        bottom: (vl ? vl.bottom + ht : ht),
        right: (vl ? vl.right : 0),
        width: vt
      };
      vscroll.set('layout', layout);
      vo = this.get('verticalOverlay');
      clipLayout.right = vo ? 0 : (layout.right + vt);
    } else {
      clipLayout.right = 0;
    }
    if (vscroll) vscroll.set('isVisible', hasVertical);

    clip.adjust(clipLayout);
  },

  /** @private
    Called whenever a scroller visibility changes.  Calls the tile() method.
  */
  scrollerVisibilityDidChange: function () {
    this.tile();
  }.observes('isVerticalScrollerVisible', 'isHorizontalScrollerVisible'),

  // ..........................................................
  // SCROLL WHEEL SUPPORT
  //

  /** @private */
  _scroll_wheelDeltaX: 0,

  /** @private */
  _scroll_wheelDeltaY: 0,

  /** @private */
  mouseWheel: function (evt) {
    if (!this.get('isEnabledInPane')) return NO;

    var horizontalScrollOffset = this.get('horizontalScrollOffset'),
        maximumHorizontalScrollOffset = this.get('maximumHorizontalScrollOffset'),
        maximumVerticalScrollOffset = this.get('maximumVerticalScrollOffset'),
        shouldScroll = NO,
        verticalScrollOffset = this.get('verticalScrollOffset');

    // Only attempt to scroll if we are allowed to scroll in the direction and
    // have room to scroll in the direction.  Otherwise, ignore the event so
    // that an outer ScrollView may capture it.
    shouldScroll = ((this.get('canScrollHorizontal') &&
        (evt.wheelDeltaX < 0 && horizontalScrollOffset > 0) ||
        (evt.wheelDeltaX > 0 && horizontalScrollOffset < maximumHorizontalScrollOffset)) ||
        (this.get('canScrollVertical') &&
        (evt.wheelDeltaY < 0 && verticalScrollOffset > 0) ||
        (evt.wheelDeltaY > 0 && verticalScrollOffset < maximumVerticalScrollOffset)));

    if (shouldScroll) {
      this._scroll_wheelDeltaX += evt.wheelDeltaX;
      this._scroll_wheelDeltaY += evt.wheelDeltaY;

      this.invokeLater(this._scroll_mouseWheel, 10);
    }

    return shouldScroll;
  },

  /** @private */
  _scroll_mouseWheel: function () {
    this.scrollBy(this._scroll_wheelDeltaX, this._scroll_wheelDeltaY);
    if (SC.WHEEL_MOMENTUM && this._scroll_wheelDeltaY > 0) {
      this._scroll_wheelDeltaY = Math.floor(this._scroll_wheelDeltaY * 0.950);
      this._scroll_wheelDeltaY = Math.max(this._scroll_wheelDeltaY, 0);
      this.invokeLater(this._scroll_mouseWheel, 10);
    } else if (SC.WHEEL_MOMENTUM && this._scroll_wheelDeltaY < 0) {
      this._scroll_wheelDeltaY = Math.ceil(this._scroll_wheelDeltaY * 0.950);
      this._scroll_wheelDeltaY = Math.min(this._scroll_wheelDeltaY, 0);
      this.invokeLater(this._scroll_mouseWheel, 10);
    } else {
      this._scroll_wheelDeltaY = 0;
      this._scroll_wheelDeltaX = 0;
    }
  },

  /*..............................................
    SCALING SUPPORT
  */

  /**
    Determines whether scaling is allowed.

    @type Boolean
    @default NO
  */
  canScale: NO,

  /** @private
    The current scale.
  */
  _scale: 1.0,

  /**
    @field
    @type Number
    @default 1.0
  */
  scale: function (key, value) {
    if (value !== undefined) {
      this._scale = Math.min(Math.max(this.get("minimumScale"), value), this.get("maximumScale"));
    }
    return this._scale;
  }.property().cacheable(),

  /**
    The minimum scale.

    @type Number
    @default 0.25
  */
  minimumScale: 0.25,

  /**
    The maximum scale.

    @type Number
    @default 2.0
  */
  maximumScale: 2.0,

  /**
    Whether to automatically determine the scale range based on the size of the content.

    @type Boolean
    @default NO
  */
  autoScaleRange: NO,

  /** @private */
  _scale_css: "",

  /** @private */
  updateScale: function (scale) {
    var contentView = this.get("contentView");
    if (!contentView) return;

    if (contentView.isScalable) {
      this.get("contentView").applyScale(scale);
      this._scale_css = "";
    } else {
      this._scale_css = "scale3d(" + scale + ", " + scale + ", 1)";
    }
  },


  // ..........................................................
  // Touch Support
  //

  /**
    @type Boolean
    @default YES
    @readOnly
  */
  acceptsMultitouch: YES,

  /**
    The scroll deceleration rate.

    @type Number
    @default SC.NORMAL_SCROLL_DECELERATION
  */
  decelerationRate: SC.NORMAL_SCROLL_DECELERATION,

  /**
    If YES, bouncing will always be enabled in the horizontal direction, even if the content
    is smaller or the same size as the view.

    @type Boolean
    @default NO
  */
  alwaysBounceHorizontal: NO,

  /**
    If NO, bouncing will not be enabled in the vertical direction when the content is smaller
    or the same size as the scroll view.

    @type Boolean
    @default YES
  */
  alwaysBounceVertical: YES,

  /**
    Whether to delay touches from passing through to the content.

    @type Boolean
    @default YES
  */
  delaysContentTouches: YES,

  /** @private
    If the view supports it, this
  */
  _touchScrollDidChange: function () {
    if (this.get("contentView").touchScrollDidChange) {
      this.get("contentView").touchScrollDidChange(
        this._scroll_horizontalScrollOffset,
        this._scroll_verticalScrollOffset
      );
    }

    // tell scrollers
    if (this.verticalScrollerView && this.verticalScrollerView.touchScrollDidChange) {
      this.verticalScrollerView.touchScrollDidChange(this._scroll_verticalScrollOffset);
    }

    if (this.horizontalScrollerView && this.horizontalScrollerView.touchScrollDidChange) {
      this.horizontalScrollerView.touchScrollDidChange(this._scroll_horizontalScrollOffset);
    }
  },

  /** @private */
  _touchScrollDidStart: function () {
    if (this.get("contentView").touchScrollDidStart) {
      this.get("contentView").touchScrollDidStart(this._scroll_horizontalScrollOffset, this._scroll_verticalScrollOffset);
    }

    // tell scrollers
    if (this.verticalScrollerView && this.verticalScrollerView.touchScrollDidStart) {
      this.verticalScrollerView.touchScrollDidStart(this._touch_verticalScrollOffset);
    }
    if (this.horizontalScrollerView && this.horizontalScrollerView.touchScrollDidStart) {
      this.horizontalScrollerView.touchScrollDidStart(this._touch_horizontalScrollOffset);
    }
  },

  /** @private */
  _touchScrollDidEnd: function () {
    if (this.get("contentView").touchScrollDidEnd) {
      this.get("contentView").touchScrollDidEnd(this._scroll_horizontalScrollOffset, this._scroll_verticalScrollOffset);
    }

    // tell scrollers
    if (this.verticalScrollerView && this.verticalScrollerView.touchScrollDidEnd) {
      this.verticalScrollerView.touchScrollDidEnd(this._touch_verticalScrollOffset);
    }

    if (this.horizontalScrollerView && this.horizontalScrollerView.touchScrollDidEnd) {
      this.horizontalScrollerView.touchScrollDidEnd(this._touch_horizontalScrollOffset);
    }
  },

  /** @private */
  _applyCSSTransforms: function (layer) {
    var transform = "";
    this.updateScale(this._scale);
    transform += 'translate3d(' +
      -this._scroll_horizontalScrollOffset +
      'px, ' +
      -Math.round(this._scroll_verticalScrollOffset) +
      'px,0) ';
    transform += this._scale_css;
    if (layer) {
      var style = layer.style;
      style.webkitTransform = transform;
      style.webkitTransformOrigin = "top left";
    }
  },

  /** @private */
  captureTouch: function () {
    return YES;
  },

  /** @private */
  touchGeneration: 0,

  /** @private */
  touchStart: function (touch) {
    var generation = ++this.touchGeneration;
    if (!this.tracking && this.get("delaysContentTouches")) {
      this.invokeLater(this.beginTouchesInContent, 150, generation);
    } else if (!this.tracking) {
      // NOTE: We still have to delay because we don't want to call touchStart
      // while touchStart is itself being called...
      this.invokeLater(this.beginTouchesInContent, 1, generation);
    }
    this.beginTouchTracking(touch, YES);
    return YES;
  },

  /** @private */
  beginTouchesInContent: function (gen) {
    if (gen !== this.touchGeneration) return;

    var touch = this.touch;

    // NOTE!  On iPad it is possible that the timer set in touchStart() will not have yet fired and that touchEnd() will
    // come in in the same Run Loop as the one that started with the call to touchStart().  The bad thing that happens is that
    // even though we cleared this.touch, occasionally if touchEnd() comes in right at the end of the Run Loop and
    // then the timer expires and starts a new Run Loop to call beginTouchesInContent(), that this.touch will STILL exist
    // here.  There's no explanation for it, and it's not 100% reproducible, but what happens is that if we try to capture
    // the touch that has already ended, assignTouch() in RootResponder will check touch.hasEnded and throw an exception.

    // Therefore, don't capture a touch if the touch still exists and hasEnded
    if (touch && this.tracking && !this.dragging && !touch.touch.scrollHasEnded && !touch.touch.hasEnded) {
      // try to capture the touch
      touch.touch.captureTouch(this, YES);

      if (!touch.touch.touchResponder) {
        // if it DIDN'T WORK!!!!!
        // then we need to take possession again.
        touch.touch.makeTouchResponder(this);
      } else {
        // Otherwise, it did work, and if we had a pending scroll end, we must do it now
        if (touch.needsScrollEnd) {
          this._touchScrollDidEnd();
        }
      }
    }
  },

  /** @private
    Initializes the start state of the gesture.

    We keep information about the initial location of the touch so we can
    disambiguate between a tap and a drag.

    @param {Event} evt
  */
  beginTouchTracking: function (touch, starting) {
    var avg = touch.averagedTouchesForView(this, starting);

    var verticalScrollOffset = this._scroll_verticalScrollOffset || 0,
        horizontalScrollOffset = this._scroll_horizontalScrollOffset || 0,
        startClipOffsetX = horizontalScrollOffset,
        startClipOffsetY = verticalScrollOffset,
        needsScrollEnd = NO,
        contentWidth = 0,
        contentHeight = 0,
        existingTouch = this.touch,
        viewFrame,
        view;

    if (existingTouch && !SC.none(existingTouch.animationID)) {
      // If a deceleration calculation is queued to run, we need to cancel it so
      // it doesn't run after we begin touch tracking again.
      window.cancelAnimationFrame(existingTouch.animationID);

      // get the scroll offsets
      startClipOffsetX = this.touch.startClipOffset.x;
      startClipOffsetY = this.touch.startClipOffset.y;
      needsScrollEnd = YES;
    }

    // calculate container+content width/height
    view = this.get('contentView');

    if (view) {
      viewFrame = view.get('frame');
      contentWidth = viewFrame.width;
      contentHeight = viewFrame.height;
    }

    if (view.calculatedWidth && view.calculatedWidth !== 0) contentWidth = view.calculatedWidth;
    if (view.calculatedHeight && view.calculatedHeight !== 0) contentHeight = view.calculatedHeight;

    var containerFrame = this.get('containerView').get('frame'),
        containerWidth = containerFrame.width,
        containerHeight = containerFrame.height;


    // calculate position in content
    var globalFrame = this.convertFrameToView(this.get("frame"), null),
        positionInContentX = (horizontalScrollOffset + (avg.x - globalFrame.x)) / this._scale,
        positionInContentY = (verticalScrollOffset + (avg.y - globalFrame.y)) / this._scale;

    this.touch = {
      startTime: touch.timeStamp,
      notCalculated: YES,

      enableScrolling: {
        x: contentWidth * this._scale > containerWidth || this.get("alwaysBounceHorizontal"),
        y: contentHeight * this._scale > containerHeight || this.get("alwaysBounceVertical")
      },
      scrolling: { x: NO, y: NO },

      enableBouncing: SC.platform.bounceOnScroll,

      // offsets and velocities
      startClipOffset: { x: startClipOffsetX, y: startClipOffsetY },
      lastScrollOffset: { x: horizontalScrollOffset, y: verticalScrollOffset },
      startTouchOffset: { x: avg.x, y: avg.y },
      scrollVelocity: { x: 0, y: 0 },

      startTouchOffsetInContent: { x: positionInContentX, y: positionInContentY },

      containerSize: { width: containerWidth, height: containerHeight },
      contentSize: { width: contentWidth, height: contentHeight },

      startScale: this._scale,
      startDistance: avg.d,
      canScale: this.get("canScale") && SC.platform.pinchToZoom,
      minimumScale: this.get("minimumScale"),
      maximumScale: this.get("maximumScale"),

      globalFrame: globalFrame,

      // cache some things
      layer: view.get('layer'), //contentView

      // some constants
      resistanceCoefficient: 0.998,
      resistanceAsymptote: 320,
      decelerationFromEdge: 0.05,
      accelerationToEdge: 0.1,

      // how much percent of the other drag direction you must drag to start dragging that direction too.
      scrollTolerance: { x: 15, y: 15 },
      scaleTolerance: 5,
      secondaryScrollTolerance: 30,
      scrollLock: 500,

      decelerationRate: this.get("decelerationRate"),

      // general status
      lastEventTime: touch.timeStamp,

      // the touch used
      touch: (starting ? touch : (this.touch ? this.touch.touch : null)),

      // needsScrollEnd will cause a scrollDidEnd even if this particular touch does not start a scroll.
      // the reason for this is because we don't want to say we've stopped scrolling just because we got
      // another touch, but simultaneously, we still need to send a touch end eventually.
      // there are two cases in which this will be used:
      //
      //    1. If the touch was sent to content touches (in which case we will not be scrolling)
      //    2. If the touch ends before scrolling starts (no scrolling then, either)
      needsScrollEnd: needsScrollEnd
    };

    if (!this.tracking) {
      this.tracking = YES;
      this.dragging = NO;
    }
  },

  /** @private */
  _adjustForEdgeResistance: function (offset, minOffset, maxOffset, resistanceCoefficient, asymptote) {
    var distanceFromEdge;

    // find distance from edge
    if (offset < minOffset) distanceFromEdge = offset - minOffset;
    else if (offset > maxOffset) distanceFromEdge = maxOffset - offset;
    else return offset;

    // manipulate logarithmically
    distanceFromEdge = Math.pow(resistanceCoefficient, Math.abs(distanceFromEdge)) * asymptote;

    // adjust mathematically
    if (offset < minOffset) distanceFromEdge = distanceFromEdge - asymptote;
    else distanceFromEdge = -distanceFromEdge + asymptote;

    // generate final value
    return Math.min(Math.max(minOffset, offset), maxOffset) + distanceFromEdge;
  },

  /** @private */
  touchesDragged: function (evt) {
    var avg = evt.averagedTouchesForView(this);

    this.updateTouchScroll(avg.x, avg.y, avg.d, evt.timeStamp);
  },

  /** @private */
  updateTouchScroll: function (touchX, touchY, distance, timeStamp) {
    // get some vars
    var touch = this.touch,
        touchXInFrame = touchX - touch.globalFrame.x,
        touchYInFrame = touchY - touch.globalFrame.y,
        offsetY,
        maxOffsetY,
        offsetX,
        maxOffsetX,
        minOffsetX, minOffsetY,
        touchScroll = touch.scrolling,
        hAlign = this.get("horizontalAlign"),
        vAlign = this.get("verticalAlign");

    // calculate new position in content
    var positionInContentX = ((this._scroll_horizontalScrollOffset || 0) + touchXInFrame) / this._scale,
        positionInContentY = ((this._scroll_verticalScrollOffset || 0) + touchYInFrame) / this._scale;

    // calculate deltas
    var deltaX = positionInContentX - touch.startTouchOffsetInContent.x,
        deltaY = positionInContentY - touch.startTouchOffsetInContent.y;

    var isDragging = touch.dragging;
    if (!touchScroll.x && Math.abs(deltaX) > touch.scrollTolerance.x && touch.enableScrolling.x) {
      // say we are scrolling
      isDragging = YES;
      touchScroll.x = YES;
      touch.scrollTolerance.y = touch.secondaryScrollTolerance;

      // reset position
      touch.startTouchOffset.x = touchX;
      deltaX = 0;
    }
    if (!touchScroll.y && Math.abs(deltaY) > touch.scrollTolerance.y && touch.enableScrolling.y) {
      // say we are scrolling
      isDragging = YES;
      touchScroll.y = YES;
      touch.scrollTolerance.x = touch.secondaryScrollTolerance;

      // reset position
      touch.startTouchOffset.y = touchY;
      deltaY = 0;
    }

    // handle scroll start
    if (isDragging && !touch.dragging) {
      touch.dragging = YES;
      this.dragging = YES;
      this._touchScrollDidStart();
    }

    // calculate new offset
    if (!touchScroll.x && !touchScroll.y && !touch.canScale) return;
    if (touchScroll.x && !touchScroll.y) {
      if (deltaX > touch.scrollLock && !touchScroll.y) touch.enableScrolling.y = NO;
    }
    if (touchScroll.y && !touchScroll.x) {
      if (deltaY > touch.scrollLock && !touchScroll.x) touch.enableScrolling.x = NO;
    }

    // handle scaling through pinch gesture
    if (touch.canScale) {

      var startDistance = touch.startDistance, dd = distance - startDistance;
      if (Math.abs(dd) > touch.scaleTolerance) {
        touchScroll.y = YES; // if you scale, you can scroll.
        touchScroll.x = YES;

        // we want to say something that was the startDistance away from each other should now be
        // distance away. So, if we are twice as far away as we started...
        var scale = touch.startScale * (distance / Math.max(startDistance, 50));

        var newScale = this._adjustForEdgeResistance(scale, touch.minimumScale, touch.maximumScale, touch.resistanceCoefficient, touch.resistanceAsymptote);
        this.dragging = YES;
        this._scale = newScale;
        // var newPositionInContentX = positionInContentX * this._scale,
        //     newPositionInContentY = positionInContentY * this._scale;
      }
    }

    // these do exactly what they sound like. So, this comment is just to
    // block off the code a bit
    // In english, these calculate the minimum X/Y offsets
    minOffsetX = this.minimumScrollOffset(touch.contentSize.width * this._scale, touch.containerSize.width, hAlign);
    minOffsetY = this.minimumScrollOffset(touch.contentSize.height * this._scale, touch.containerSize.height, vAlign);

    // and now, maximum...
    maxOffsetX = this.maximumScrollOffset(touch.contentSize.width * this._scale, touch.containerSize.width, hAlign);
    maxOffsetY = this.maximumScrollOffset(touch.contentSize.height * this._scale, touch.containerSize.height, vAlign);


    // So, the following is the completely written out algebra:
    // (offsetY + touchYInFrame) / this._scale = touch.startTouchOffsetInContent.y
    // offsetY + touchYInFrame = touch.startTouchOffsetInContent.y * this._scale;
    // offsetY = touch.startTouchOffset * this._scale - touchYInFrame

    // and the result applied:
    offsetX = touch.startTouchOffsetInContent.x * this._scale - touchXInFrame;
    offsetY = touch.startTouchOffsetInContent.y * this._scale - touchYInFrame;


    // we need to adjust for edge resistance, or, if bouncing is disabled, just stop flat.
    if (touch.enableBouncing) {
      offsetX = this._adjustForEdgeResistance(offsetX, minOffsetX, maxOffsetX, touch.resistanceCoefficient, touch.resistanceAsymptote);
      offsetY = this._adjustForEdgeResistance(offsetY, minOffsetY, maxOffsetY, touch.resistanceCoefficient, touch.resistanceAsymptote);
    } else {
      offsetX = Math.max(minOffsetX, Math.min(maxOffsetX, offsetX));
      offsetY = Math.max(minOffsetY, Math.min(maxOffsetY, offsetY));
    }

    // and now, _if_ scrolling is enabled, set the new coordinates
    if (touchScroll.x) this._scroll_horizontalScrollOffset = offsetX;
    if (touchScroll.y) this._scroll_verticalScrollOffset = offsetY;

    // and apply the CSS transforms.
    this._applyCSSTransforms(touch.layer);
    this._touchScrollDidChange();


    // now we must prepare for momentum scrolling by calculating the momentum.
    if (timeStamp - touch.lastEventTime >= 1 || touch.notCalculated) {
      touch.notCalculated = NO;
      var horizontalOffset = this._scroll_horizontalScrollOffset;
      var verticalOffset = this._scroll_verticalScrollOffset;

      touch.scrollVelocity.x = ((horizontalOffset - touch.lastScrollOffset.x) / Math.max(1, timeStamp - touch.lastEventTime)); // in px per ms
      touch.scrollVelocity.y = ((verticalOffset - touch.lastScrollOffset.y) / Math.max(1, timeStamp - touch.lastEventTime)); // in px per ms
      touch.lastScrollOffset.x = horizontalOffset;
      touch.lastScrollOffset.y = verticalOffset;
      touch.lastEventTime = timeStamp;
    }
  },

  /** @private */
  touchEnd: function (touch) {
    var touchStatus = this.touch,
        avg = touch.averagedTouchesForView(this);

    touch.scrollHasEnded = YES;
    if (avg.touchCount > 0) {
      this.beginTouchTracking(touch, NO);
    } else {
      if (this.dragging) {
        touchStatus.dragging = NO;

        // reset last event time
        touchStatus.lastEventTime = touch.timeStamp;

        this.startDecelerationAnimation();
      } else {
        // well. The scrolling stopped. Let us tell everyone if there was a pending one that this non-drag op interrupted.
        if (touchStatus.needsScrollEnd) this._touchScrollDidEnd();

        // this part looks weird, but it is actually quite simple.
        // First, we send the touch off for capture+starting again, but telling it to return to us
        // if nothing is found or if it is released.
        touch.captureTouch(this, YES);

        // if we went anywhere, did anything, etc., call end()
        if (touch.touchResponder && touch.touchResponder !== this) {
          touch.end();
        } else if (!touch.touchResponder || touch.touchResponder === this) {
          // if it was released to us or stayed with us the whole time, or is for some
          // wacky reason empty (in which case it is ours still). If so, and there is a next responder,
          // relay to that.

          if (touch.nextTouchResponder) touch.makeTouchResponder(touch.nextTouchResponder);
        } else {
          // in this case, the view that captured it and changed responder should have handled
          // everything for us.
        }

        this.touch = null;
      }

      this.tracking = NO;
      this.dragging = NO;
    }
  },

  /** @private */
  touchCancelled: function () {
    var touchStatus = this.touch;

    // if we are decelerating, we don't want to stop that. That would be bad. Because there's no point.
    if (!touchStatus || !touchStatus.animationID) {
      this.beginPropertyChanges();
      this.set("scale", this._scale);
      this.set("verticalScrollOffset", this._scroll_verticalScrollOffset);
      this.set("horizontalScrollOffset", this._scroll_horizontalScrollOffset);
      this.endPropertyChanges();
      this.tracking = NO;

      if (this.dragging) {
        this._touchScrollDidEnd();
      }

      this.dragging = NO;
      this.touch = null;
    }
  },

  /** @private */
  startDecelerationAnimation: function (evt) {
    var touch = this.touch, self = this;
    touch.decelerationVelocity = {
      x: touch.scrollVelocity.x * 10,
      y: touch.scrollVelocity.y * 10
    };

    touch.animationID = window.requestAnimationFrame(function () {
      self.decelerateAnimation();
    });
  },

  /** @private
    Does bounce calculations, adjusting velocity.
  */
  bouncyBounce: function (velocity, value, minValue, maxValue, de, ac, additionalAcceleration) {
    // we have 4 possible paths. On a higher level, we have two leaf paths that can be applied
    // for either of two super-paths.
    //
    // The first path is if we are decelerating past an edge: in this case, this function must
    // must enhance that deceleration. In this case, our math boils down to taking the amount
    // by which we are past the edge, multiplying it by our deceleration factor, and reducing
    // velocity by that amount.
    //
    // The second path is if we are not decelerating, but are still past the edge. In this case,
    // we must start acceleration back _to_ the edge. The math here takes the distance we are from
    // the edge, multiplies by the acceleration factor, and then performs two additional things:
    // First, it speeds up the acceleration artificially  with additionalAcceleration; this will
    // make the stop feel more sudden, as it will still have this additional acceleration when it reaches
    // the edge. Second, it ensures the result does not go past the final value, so we don't end up
    // bouncing back and forth all crazy-like.
    if (value < minValue) {
      if (velocity < 0) velocity = velocity + ((minValue - value) * de);
      else {
        velocity = Math.min((minValue - value) * ac + additionalAcceleration, minValue - value - 0.01);
      }
    } else if (value > maxValue) {
      if (velocity > 0) velocity = velocity - ((value - maxValue) * de);
      else {
        velocity = -Math.min((value - maxValue) * ac + additionalAcceleration, value - maxValue - 0.01);
      }
    }
    return velocity;
  },

  /** @private Decelerates the scrolling smoothly. */
  decelerateAnimation: function () {
    // get a bunch of properties. They are named well, so not much explanation of what they are...
    // However, note maxOffsetX/Y takes into account the scale;
    // also, newX/Y adds in the current deceleration velocity (the deceleration velocity will
    // be changed later in this function).
    var touch = this.touch,
        scale = this._scale,
        touchDim = touch.contentSize,
        touchContainerDim = touch.containerSize,
        hAlign = this.get("horizontalAlign"),
        vAlign = this.get("verticalAlign"),
        minOffsetX = this.minimumScrollOffset(touchDim.width * this._scale, touchContainerDim.width, hAlign),
        minOffsetY = this.minimumScrollOffset(touchDim.height * this._scale, touchContainerDim.height, vAlign),
        maxOffsetX = this.maximumScrollOffset(touchDim.width * this._scale, touchContainerDim.width, hAlign),
        maxOffsetY = this.maximumScrollOffset(touchDim.height * this._scale, touchContainerDim.height, vAlign),

        now = Date.now(),
        t = Math.max(now - touch.lastEventTime, 1),

        newX = this._scroll_horizontalScrollOffset + touch.decelerationVelocity.x * (t / 10),
        newY = this._scroll_verticalScrollOffset + touch.decelerationVelocity.y * (t / 10);

    var de = touch.decelerationFromEdge, ac = touch.accelerationToEdge;

    // under a few circumstances, we may want to force a valid X/Y position.
    // For instance, if bouncing is disabled, or if position was okay before
    // adjusting scale.
    var forceValidXPosition = !touch.enableBouncing, forceValidYPosition = !touch.enableBouncing;

    // determine if position was okay before adjusting scale (which we do, in
    // a lovely, animated way, for the scaled out/in too far bounce-back).
    // if the position was okay, then we are going to make sure that we keep the
    // position okay when adjusting the scale.
    //
    // Position OKness, here, referring to if the position is valid (within
    // minimum and maximum scroll offsets)
    if (newX >= minOffsetX && newX <= maxOffsetX) forceValidXPosition = YES;
    if (newY >= minOffsetY && newY <= maxOffsetY) forceValidYPosition = YES;

    // We are going to change scale in a moment, but the position should stay the
    // same, if possible (unless it would be more jarring, as described above, in
    // the case of starting with a valid position and ending with an invalid one).
    //
    // Because we are changing the scale, we need to make the position scale-neutral.
    // we'll make it non-scale-neutral after applying scale.
    //
    // Question: might it be better to save the center position instead, so scaling
    // bounces back around the center of the screen?
    newX /= this._scale;
    newY /= this._scale;

    // scale velocity (amount to change) starts out at 0 each time, because
    // it is calculated by how far out of bounds it is, rather than by the
    // previous such velocity.
    var sv = 0;

    // do said calculation; we'll use the same bouncyBounce method used for everything
    // else, but our adjustor that gives a minimum amount to change by and (which, as we'll
    // discuss, is to make the stop feel slightly more like a stop), we'll leave at 0
    // (scale doesn't really need it as much; if you disagree, at least come up with
    // numbers more appropriate for scale than the ones for X/Y)
    sv = this.bouncyBounce(sv, scale, touch.minimumScale, touch.maximumScale, de, ac, 0);

    // add the amount to scale. This is linear, rather than multiplicative. If you think
    // it should be multiplicative (or however you say that), come up with a new formula.
    this._scale = scale = scale + sv;

    // now we can convert newX/Y back to scale-specific coordinates...
    newX *= this._scale;
    newY *= this._scale;

    // It looks very weird if the content started in-bounds, but the scale animation
    // made it not be in bounds; it causes the position to animate snapping back, and,
    // well, it looks very weird. It is more proper to just make sure it stays in a valid
    // position. So, we'll determine the new maximum/minimum offsets, and then, if it was
    // originally a valid position, we'll adjust the new position to a valid position as well.


    // determine new max offset
    minOffsetX = this.minimumScrollOffset(touchDim.width * this._scale, touchContainerDim.width, hAlign);
    minOffsetY = this.minimumScrollOffset(touchDim.height * this._scale, touchContainerDim.height, vAlign);
    maxOffsetX = this.maximumScrollOffset(touchDim.width * this._scale, touchContainerDim.width, hAlign);
    maxOffsetY = this.maximumScrollOffset(touchDim.height * this._scale, touchContainerDim.height, vAlign);

    // see if scaling messed up the X position (but ignore if 'tweren't right to begin with).
    if (forceValidXPosition && (newX < minOffsetX || newX > maxOffsetX)) {
      // Correct the position
      newX = Math.max(minOffsetX, Math.min(newX, maxOffsetX));

      // also, make the velocity be ZERO; it is obviously not needed...
      touch.decelerationVelocity.x = 0;
    }

    // now the y
    if (forceValidYPosition && (newY < minOffsetY || newY > maxOffsetY)) {
      // again, correct it...
      newY = Math.max(minOffsetY, Math.min(newY, maxOffsetY));

      // also, make the velocity be ZERO; it is obviously not needed...
      touch.decelerationVelocity.y = 0;
    }


    // now that we are done modifying the position, we may update the actual scroll
    this._scroll_horizontalScrollOffset = newX;
    this._scroll_verticalScrollOffset = newY;

    this._applyCSSTransforms(touch.layer); // <- Does what it sounds like.

    this._touchScrollDidChange();

    // Now we have to adjust the velocities. The velocities are simple x and y numbers that
    // get added to the scroll X/Y positions each frame.
    // The default decay rate is .950 per frame. To achieve some semblance of accuracy, we
    // make it to the power of the elapsed number of frames. This is not fully accurate,
    // as this is applying the elapsed time between this frame and the previous time to
    // modify the velocity for the next frame. My mind goes blank when I try to figure out
    // a way to fix this (given that we don't want to change the velocity on the first frame),
    // and as it seems to work great as-is, I'm just leaving it.
    var decay = touch.decelerationRate,
        decayXtime = Math.pow(decay, (t / 10));
    touch.decelerationVelocity.y *= decayXtime;
    touch.decelerationVelocity.x *= decayXtime;

    // We have a bouncyBounce method that adjusts the velocity for bounce. That is, if it is
    // out of range and still going, it will slow it down. This step is decelerationFromEdge.
    // If it is not moving (or has come to a stop from decelerating), but is still out of range,
    // it will start it moving back into range (accelerationToEdge)
    // we supply de and ac as these properties.
    // The .3 artificially increases the acceleration by .3; this is actually to make the final
    // stop a bit more abrupt.
    touch.decelerationVelocity.x = this.bouncyBounce(touch.decelerationVelocity.x, newX, minOffsetX, maxOffsetX, de, ac, 0.3);
    touch.decelerationVelocity.y = this.bouncyBounce(touch.decelerationVelocity.y, newY, minOffsetY, maxOffsetY, de, ac, 0.3);

    // if we ain't got no velocity... then we must be finished, as there is no where else to go.
    // to determine our velocity, we take the absolue value, and use that; if it is less than .01, we
    // must be done. Note that we check scale's most recent velocity, calculated above using bouncyBounce,
    // as well.
    var absXVelocity = Math.abs(touch.decelerationVelocity.x),
        absYVelocity = Math.abs(touch.decelerationVelocity.y);
    if (absYVelocity < 0.05 && absXVelocity < 0.05 && Math.abs(sv) < 0.05) {
      // We can reset the animation id, as it will no longer be required, and we don't want to accidentally try to cancel it later.
      touch.animationID = null;
      this.touch = null;

      // trigger scroll end
      this._touchScrollDidEnd();

      // set the scale, vertical, and horizontal offsets to what they technically already are,
      // but don't know they are yet. This will finally update things like, say, the clipping frame.
      SC.run(function () {
        this.beginPropertyChanges();
        this.set("scale", this._scale);
        this.set("verticalScrollOffset", this._scroll_verticalScrollOffset);
        this.set("horizontalScrollOffset", this._scroll_horizontalScrollOffset);
        this.endPropertyChanges();
      }, this);

      return;
    }

    // We now set up the next round. We are doing this as raw as we possibly can, not touching the
    // run loop at all. This speeds up performance drastically--keep in mind, we're on comparatively
    // slow devices, here. So, we'll just make a closure, saving "this" into "self" and calling
    // 10ms later (or however long it takes).

    // Note also that we save both the last event time (so we may calculate elapsed time) and the animation
    // id we are creating, so we may cancel it in future.
    var self = this;
    touch.lastEventTime = Date.now();
    touch.animationID = window.requestAnimationFrame(function () {
      self.decelerateAnimation();
    });
  },

  // ..........................................................
  // INTERNAL SUPPORT
  //

  /** @private
    Instantiate scrollers & container views as needed.  Replace their classes
    in the regular properties.
  */
  createChildViews: function () {
    var childViews = [], view;

    // create the containerView.  We must always have a container view.
    // also, setup the contentView as the child of the containerView...
    if (SC.none(view = this.containerView)) view = SC.ContainerView;

    childViews.push(this.containerView = this.createChildView(view, {
      contentView: this.contentView,
      isScrollContainer: YES
    }));

    // and replace our own contentView...
    this.contentView = this.containerView.get('contentView');

    // create a horizontal scroller view if needed...
    view = SC.platform.touch ? this.get("horizontalTouchScrollerView") : this.get("horizontalScrollerView");
    if (view) {
      if (this.get('hasHorizontalScroller')) {
        view = this.horizontalScrollerView = this.createChildView(view, {
          layoutDirection: SC.LAYOUT_HORIZONTAL,
          valueBinding: '*owner.horizontalScrollOffset'
        });
        childViews.push(view);
      } else this.horizontalScrollerView = null;
    }

    // create a vertical scroller view if needed...
    view = SC.platform.touch ? this.get("verticalTouchScrollerView") : this.get("verticalScrollerView");
    if (view) {
      if (this.get('hasVerticalScroller')) {
        view = this.verticalScrollerView = this.createChildView(view, {
          layoutDirection: SC.LAYOUT_VERTICAL,
          valueBinding: '*owner.verticalScrollOffset'
        });
        childViews.push(view);
      } else this.verticalScrollerView = null;
    }

    // set childViews array.
    this.childViews = childViews;

    this.contentViewDidChange(); // setup initial display...
    this.tile(); // set up initial tiling
  },

  /** @private */
  init: function () {
    arguments.callee.base.apply(this,arguments);

    // start observing initial content view.  The content view's frame has
    // already been setup in prepareDisplay so we don't need to call
    // viewFrameDidChange...
    this._scroll_contentView = this.get('contentView');
    var contentView = this._scroll_contentView;

    if (contentView) {
      contentView.addObserver('frame', this, 'contentViewFrameDidChange');
      contentView.addObserver('calculatedWidth', this, 'contentViewFrameDidChange');
      contentView.addObserver('calculatedHeight', this, 'contentViewFrameDidChange');
      contentView.addObserver('layer', this, 'contentViewLayerDidChange');
    }

    if (this.get('isVisibleInWindow')) this._scsv_registerAutoscroll();

    // Initialize cache values.
    this._scroll_contentWidth = this._scroll_contentHeight = null;
  },

  /** @private
    Registers/deregisters view with SC.Drag for autoscrolling
  */
  _scsv_registerAutoscroll: function () {
    if (this.get('isVisibleInWindow')) SC.Drag.addScrollableView(this);
    else SC.Drag.removeScrollableView(this);
  }.observes('isVisibleInWindow'),

  /** @private
    Whenever the contentView is changed, we need to observe the content view's
    frame to be notified whenever it's size changes.
  */
  contentViewDidChange: function () {
    var newView = this.get('contentView'),
        oldView = this._scroll_contentView;

    if (newView !== oldView) {

      // stop observing old content view
      if (oldView) {
        oldView.removeObserver('calculatedWidth', this, 'contentViewFrameDidChange');
        oldView.removeObserver('calculatedHeight', this, 'contentViewFrameDidChange');
        oldView.removeObserver('frame', this, 'contentViewFrameDidChange');
        oldView.removeObserver('layer', this, 'contentViewLayerDidChange');
      }

      // update cache
      this._scroll_contentView = newView;
      if (newView) {
        newView.addObserver('frame', this, 'contentViewFrameDidChange');
        newView.addObserver('calculatedWidth', this, 'contentViewFrameDidChange');
        newView.addObserver('calculatedHeight', this, 'contentViewFrameDidChange');
        newView.addObserver('layer', this, 'contentViewLayerDidChange');
      }

      // replace container
      this.containerView.set('contentView', newView);

      this.contentViewFrameDidChange();
    }
  }.observes('contentView'),

  /** @private
    If we redraw after the initial render, we need to make sure that we reset
    the scrollTop/scrollLeft properties on the content view.  This ensures
    that, for example, the scroll views displays correctly when switching
    views out in a ContainerView.
  */
  render: function (context, firstTime) {
    this.invokeLast(this.adjustElementScroll);

    if (firstTime) {
      context.push('<div class="corner"></div>');
    }
    return arguments.callee.base.apply(this,arguments);
  },

  /** @private */
  oldMaxHOffset: 0,

  /** @private */
  oldMaxVOffset: 0,

  /** @private
    Invoked whenever the contentView's frame changes.  This will update the
    scroller maximum and optionally update the scroller visibility if the
    size of the contentView changes.  We don't care about the origin since
    that is tracked separately from the offset values.
  */
  contentViewFrameDidChange: function (force) {
    var view   = this.get('contentView'),
        f      = (view) ? view.get('frame') : null,
        scale  = this._scale,
        width  = 0,
        height = 0,
        dim, dimWidth, dimHeight;

    // If no view has been set yet, or it doesn't have a frame,
    // we can avoid doing any work.
    if (!view || !f) { return; }

    width = view.get('calculatedWidth') || f.width || 0;
    height = view.get('calculatedHeight') || f.height || 0;

    width *= scale;
    height *= scale;

    // cache out scroll settings...
    if ((width === this._scroll_contentWidth) && (height === this._scroll_contentHeight)) return;
    this._scroll_contentWidth  = width;
    this._scroll_contentHeight = height;

    dim       = this.getPath('containerView.frame');
    dimWidth  = dim.width;
    dimHeight = dim.height;

    if (this.get('hasHorizontalScroller') && (view = this.get('horizontalScrollerView'))) {
      // decide if it should be visible or not
      if (this.get('autohidesHorizontalScroller')) {
        this.set('isHorizontalScrollerVisible', width > dimWidth);
      }
      view.setIfChanged('maximum', width - dimWidth);
      view.setIfChanged('proportion', dimWidth / width);
    }

    if (this.get('hasVerticalScroller') && (view = this.get('verticalScrollerView'))) {
      // decide if it should be visible or not
      if (this.get('autohidesVerticalScroller')) {
        this.set('isVerticalScrollerVisible', height > dimHeight);
      }
      view.setIfChanged('maximum', height - dimHeight);
      view.setIfChanged('proportion', dimHeight / height);
    }

    // If there is no vertical scroller and auto hiding is on, make
    // sure we are at the top if not already there
    if (!this.get('isVerticalScrollerVisible') && (this.get('verticalScrollOffset') !== 0) &&
       this.get('autohidesVerticalScroller')) {
      this.set('verticalScrollOffset', 0);
    }

    // Same thing for horizontal scrolling.
    if (!this.get('isHorizontalScrollerVisible') && (this.get('horizontalScrollOffset') !== 0) &&
       this.get('autohidesHorizontalScroller')) {
      this.set('horizontalScrollOffset', 0);
    }

    // This forces to recalculate the height of the frame when is at the bottom
    // of the scroll and the content dimension are smaller that the previous one
    var mxVOffSet   = this.get('maximumVerticalScrollOffset'),
        vOffSet     = this.get('verticalScrollOffset'),
        mxHOffSet   = this.get('maximumHorizontalScrollOffset'),
        hOffSet     = this.get('horizontalScrollOffset'),
        forceHeight = mxVOffSet < vOffSet,
        forceWidth  = mxHOffSet < hOffSet;
    if (forceHeight || forceWidth) {
      // Update the position of the content view to fit.
      this.forceDimensionsRecalculation(forceWidth, forceHeight, vOffSet, hOffSet);
    } else {
      // Reapply the position. Most importantly, this reapplies the touch transforms on the content view in case they were overwritten.
      this.invokeLast(this.adjustElementScroll);
    }

    // send change notifications since they don't invalidate automatically
    this.notifyPropertyChange('maximumVerticalScrollOffset');
    this.notifyPropertyChange('maximumHorizontalScrollOffset');
  },

  /** @private
    If our frame changes, then we need to re-calculate the visibility of our
    scrollers, etc.
  */
  frameDidChange: function () {
    this._scroll_contentWidth = this._scroll_contentHeight = null;
    this.contentViewFrameDidChange();
  }.observes('frame'),

  /** @private
    If the layer of the content view changes, we need to readjust the
    scrollTop and scrollLeft properties on the new DOM element.
  */
  contentViewLayerDidChange: function () {
    // Invalidate these cached values, as they're no longer valid
    if (this._verticalScrollOffset !== 0) this._verticalScrollOffset = -1;
    if (this._horizontalScrollOffset !== 0) this._horizontalScrollOffset = -1;
    this.invokeLast(this.adjustElementScroll);
  },

  /** @private
    Whenever the horizontal scroll offset changes, update the scrollers and
    edit the location of the contentView.
  */
  _scroll_horizontalScrollOffsetDidChange: function () {
    this.invokeLast(this.adjustElementScroll);
  }.observes('horizontalScrollOffset'),

  /** @private
    Whenever the vertical scroll offset changes, update the scrollers and
    edit the location of the contentView.
  */
  _scroll_verticalScrollOffsetDidChange: function () {
    this.invokeLast(this.adjustElementScroll);
  }.observes('verticalScrollOffset'),

  /** @private
    Called at the end of the run loop to actually adjust the scrollTop
    and scrollLeft properties of the container view.
  */
  adjustElementScroll: function () {
    var container = this.get('containerView'),
        content = this.get('contentView'),
        verticalScrollOffset = this.get('verticalScrollOffset'),
        horizontalScrollOffset = this.get('horizontalScrollOffset');

    // We notify the content view that its frame property has changed
    // before we actually update the scrollTop/scrollLeft properties.
    // This gives views that use incremental rendering a chance to render
    // newly-appearing elements before they come into view.
    if (content) {
      // Use accelerated drawing if the browser supports it
      if (SC.platform.touch) {
        this._applyCSSTransforms(content.get('layer'));
      }

      // Notify the child that its frame is changing.
      if (content._viewFrameDidChange) { content._viewFrameDidChange(); }
    }

    if (container && !SC.platform.touch) {
      container = container.$()[0];

      if (container) {
        if (verticalScrollOffset !== this._verticalScrollOffset) {
          container.scrollTop = verticalScrollOffset;
          this._verticalScrollOffset = verticalScrollOffset;
        }

        if (horizontalScrollOffset !== this._horizontalScrollOffset) {
          container.scrollLeft = horizontalScrollOffset;
          this._horizontalScrollOffset = horizontalScrollOffset;
        }
      }
    }
  },

  /** @private */
  forceDimensionsRecalculation: function (forceWidth, forceHeight, vOffSet, hOffSet) {
    var oldScrollHOffset = hOffSet;
    var oldScrollVOffset = vOffSet;
    this.scrollTo(0, 0);

    if (forceWidth && forceHeight) {
      this.scrollTo(this.get('maximumHorizontalScrollOffset'), this.get('maximumVerticalScrollOffset'));
    }
    if (forceWidth && !forceHeight) {
      this.scrollTo(this.get('maximumHorizontalScrollOffset'), oldScrollVOffset);
    }
    if (!forceWidth && forceHeight) {
      this.scrollTo(oldScrollHOffset, this.get('maximumVerticalScrollOffset'));
    }
  },

  /** @private */
  _scroll_verticalScrollOffset: 0,

  /** @private */
  _scroll_horizontalScrollOffset: 0

});

/* >>>>>>>>>> BEGIN source/views/menu_scroll.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('views/scroll');

/** @class

  Implements a complete scroller view for menus.  This class implements the
  arrows displayed in a menu to scroll.

  The main difference with SC.ScrollerView is that there is only vertical
  scrollers. Value Syncing between SC.MenuScrollView and SC.MenuScrollerView
  is done using valueBinding.

  @extends SC.ScrollerView
  @since SproutCore 1.0
*/
SC.MenuScrollerView = SC.ScrollerView.extend(
/** @scope SC.MenuScrollerView.prototype */ {

  /**
    @type Array
    @default ['sc-menu-scroller-view']
    @see SC.View#classNames
  */
  classNames: ['sc-menu-scroller-view'],

  // ..........................................................
  // PROPERTIES
  //

  /**
    Used to set the scrolling direction of the scroller.

    @type Boolean
    @default NO
  */
  scrollDown: NO,

  /**
    The scroller offset value.  This value will adjust between the minimum
    and maximum values that you set. Default is 0.

    @field
    @type Number
    @observes maximum
  */
  value: function (key, val) {
    if (val !== undefined) {
      // Don't enforce the maximum now, because the scroll view could change
      // height and we want our content to stay put when it does.
      this._value = val;
    } else {
      var value = this._value || 0; // default value is at top/left
      return Math.min(value, this.get('maximum'));
    }
  }.property('maximum').cacheable(),

  /**
    The maximum offset value for the scroller.  This will be used to calculate
    the internal height/width of the scroller itself. It is not necessarily
    the same as the height of a scroll view's content view.

    When set less than the height of the scroller, the scroller is disabled.

    @type Number
    @default 0
  */
  maximum: 0,

  /**
    YES if enable scrollbar, NO to disable it.  Scrollbars will automatically
    disable if the maximum scroll width does not exceed their capacity.

    @type Boolean
    @default YES
  */
  isEnabled: YES,

  /**
    Determine the layout direction.  Determines whether the scrollbar should
    appear horizontal or vertical.  This must be set when the view is created.
    Changing this once the view has been created will have no effect. Possible
    values:

      - SC.LAYOUT_VERTICAL
      - SC.LAYOUT_HORIZONTAL

    @type String
    @default SC.LAYOUT_VERTICAL
  */
  layoutDirection: SC.LAYOUT_VERTICAL,

  /**
     Amount to scroll one vertical line.

     @type Number
     @default 20
  */
  verticalLineScroll: 20,

  /**
    This function overrides the default function in SC.Scroller as
    menus only have vertical scrolling.

    @field
    @type String
    @default 'verticalScrollOffset'
  */
  ownerScrollValueKey: function () {
    return 'verticalScrollOffset';
  }.property('layoutDirection').cacheable(),


  // ..........................................................
  // INTERNAL SUPPORT
  //

  /** @private */
  init: function () {
    // Set the scrollerThickness based on controlSize
    switch (this.get('controlSize')) {
    case SC.TINY_CONTROL_SIZE:
      this.set('scrollerThickness', SC.MenuScrollerView.TINY_SCROLLER_THICKNESS);
      break;
    case SC.SMALL_CONTROL_SIZE:
      this.set('scrollerThickness', SC.MenuScrollerView.SMALL_SCROLLER_THICKNESS);
      break;
    case SC.REGULAR_CONTROL_SIZE:
      this.set('scrollerThickness', SC.MenuScrollerView.REGULAR_SCROLLER_THICKNESS);
      break;
    case SC.LARGE_CONTROL_SIZE:
      this.set('scrollerThickness', SC.MenuScrollerView.LARGE_SCROLLER_THICKNESS);
      break;
    case SC.HUGE_CONTROL_SIZE:
      this.set('scrollerThickness', SC.MenuScrollerView.HUGE_SCROLLER_THICKNESS);
      break;
    }

    return arguments.callee.base.apply(this,arguments);
  },

  /** @private */
  render: function (context, firstTime) {
    context.addClass('sc-vertical');
    context.addClass(this.get('controlSize'));
    if (firstTime) {
      var direction = this.get('scrollDown') ? 'arrowDown' : 'arrowUp';
      context.push('<span class="scrollArrow ' + direction + '">&nbsp;</span>');
    }
  },

  /** @private */
  willDestroyLayer: function () {
    var callback = this._sc_scroller_scrollDidChange;
    SC.Event.remove(this.$(), 'scroll', this, callback);
  },

  /** @private */
  mouseEntered: function (evt) {
    this.set('isMouseOver', YES);
    this._invokeScrollOnMouseOver();
  },

  /** @private */
  mouseExited: function (evt) {
    this.set('isMouseOver', NO);
  },

  /**
    This function overrides the default function in SC.Scroller.
    SC.MenuScroller and SC.MenuScroll use valueBinding so this function is
    not necessary.
  */
  _sc_scroller_valueDidChange: function () {}.observes('value'),


  /** @private */
  _sc_scroller_armScrollTimer: function () {
    if (!this._sc_scrollTimer) {
      SC.run(function () {
        var method = this._sc_scroller_scrollDidChange;
        this._sc_scrollTimer = this.invokeLater(method, 50);
      });
    }
  },

  /** @private */
  _sc_scroller_scrollDidChange: function () {
    var now = Date.now(),
        last = this._sc_lastScroll,
        layer = this.get('layer'),
        scroll = 0;

    if (last && (now - last) < 50) return this._sc_scroller_armScrollTimer();
    this._sc_scrollTimer = null;
    this._sc_lastScroll = now;

    SC.run(function () {
      if (!this.get('isEnabledInPane')) return; // nothing to do.

      this._sc_scrollValue = scroll = layer.scrollTop;
      this.set('value', scroll); // will now enforce minimum and maximum
    });
  },


  /** @private
    Scroll the menu if it is is an up or down arrow. This is called by
    the function that simulates mouseOver.
  */
  _scrollMenu: function () {
    var val = this.get('value'), newval;
    if (this.get('scrollDown')) {
      newval = val + this.verticalLineScroll;
      if (newval <= this.get('maximum')) {
        this.set('value', newval);
      }
    } else {
      newval = val - this.verticalLineScroll;
      if (newval >= 0) {
        this.set('value', newval);
      } else if (val <= this.verticalLineScroll && val > 0) {
        this.set('value', 0);
      }
    }

    return YES;
  },

  /** @private

    We use this function to simulate mouseOver. It checks for the flag
    isMouseOver which is turned on when mouseEntered is called and turned off
    when mouseExited is called.
  */
  _invokeScrollOnMouseOver: function () {
    this._scrollMenu();
    if (this.get('isMouseOver')) {
      this.invokeLater(this._invokeScrollOnMouseOver, 50);
    }
  }

});

/**
  @static
  @type Number
  @default 18
*/
SC.MenuScrollerView.REGULAR_SCROLLER_THICKNESS = 18;

/**
  @static
  @type Number
  @default 10
*/
SC.MenuScrollerView.TINY_SCROLLER_THICKNESS    = 10;

/**
  @static
  @type Number
  @default 14
*/
SC.MenuScrollerView.SMALL_SCROLLER_THICKNESS   = 14;

/**
  @static
  @type Number
  @default 23
*/
SC.MenuScrollerView.LARGE_SCROLLER_THICKNESS   = 23;

/**
  @static
  @type Number
  @default 26
*/
SC.MenuScrollerView.HUGE_SCROLLER_THICKNESS    = 26;


/** @class

  Implements a scroll view for menus.  This class extends SC.ScrollView for
  menus.

  The main difference with SC.ScrollView is that there is only vertical
  scrolling. Value Syncing between SC.MenuScrollView and SC.MenuScrollerView
  is done using valueBinding.

  @extends SC.ScrollView
  @since SproutCore 1.0
*/
SC.MenuScrollView = SC.ScrollView.extend(
/** @scope SC.MenuScrollView.prototype */{

  /**
    @type Array
    @default ['sc-menu-scroll-view']
    @see SC.View#classNames
  */
  classNames: ['sc-menu-scroll-view'],


  // ..........................................................
  // PROPERTIES
  //


  /**
    The maximum horizontal scroll offset allowed given the current contentView
    size and the size of the scroll view.  If horizontal scrolling is
    disabled, this will always return 0.

    @type Number
    @default 0
  */
  maximumHorizontalScrollOffset: 0,


  // ..........................................................
  // SCROLLERS
  //

  /**
    YES if the view should maintain a horizontal scroller.   This property
    must be set when the view is created.

    @type Boolean
    @default NO
  */
  hasHorizontalScroller: NO,

  /**
    The horizontal scroller view class. This will be replaced with a view
    instance when the ScrollView is created unless hasHorizontalScroller is
    NO.

    @type SC.View
    @default SC.MenuScrollerView
  */
  horizontalScrollerView: SC.MenuScrollerView,

  /**
    YES if the horizontal scroller should be visible.  You can change this
    property value anytime to show or hide the horizontal scroller.  If you
    do not want to use a horizontal scroller at all, you should instead set
    hasHorizontalScroller to NO to avoid creating a scroller view in the
    first place.

    @type Boolean
    @default NO
  */
  isHorizontalScrollerVisible: NO,

  /**
    Returns YES if the view both has a horizontal scroller, the scroller is
    visible.

    @type Boolean
    @default NO
  */
  canScrollHorizontal: NO,

  /**
    If YES, the horizontal scroller will autohide if the contentView is
    smaller than the visible area.  You must set hasHorizontalScroller to YES
    for this property to have any effect.

    @type Boolean
    @default NO
  */
  autohidesHorizontalScroller: NO,

  /**
    YES if the view should maintain a vertical scroller.   This property must
    be set when the view is created.

    @type Boolean
    @default YES
  */
  hasVerticalScroller: YES,

  /**
    The vertical scroller view class. This will be replaced with a view
    instance when the ScrollView is created unless hasVerticalScroller is NO.

    @type SC.View
    @default SC.MenuScrollerView
  */
  verticalScrollerView: SC.MenuScrollerView,
  verticalScrollerView2: SC.MenuScrollerView,

  /**
    YES if the vertical scroller should be visible.  For SC.MenuScroll the
    vertical scroller is always there we just hide the arrows to scroll.

    @type Boolean
    @default YES
  */
  isVerticalScrollerVisible: YES,

  /**
    @type Boolean
    @default YES
  */
  canScrollVertical: YES,

  /**
    If YES, the vertical scroller will autohide if the contentView is
    smaller than the visible area.  You must set hasVerticalScroller to YES
    for this property to have any effect.

    @type Boolean
    @default YES
  */
  autohidesVerticalScroller: YES,

  /**
    Use this property to set the 'bottom' offset of your vertical scroller,
    to make room for a thumb view or other accessory view. Default is 0.

    @type Number
    @default 0
  */
  verticalScrollerBottom: 0,


  // ..........................................................
  // CUSTOM VIEWS
  //

  /**
    Control Size for Menu content: change verticalLineScroll

    @type String
    @default SC.REGULAR_CONTROL_SIZE
  */
  controlSize: SC.REGULAR_CONTROL_SIZE,

  /**
    The container view that will contain your main content view.  You can
    replace this property with your own custom subclass if you prefer.

    @type SC.ContainerView
    @default SC.ContainerView
  */
  containerView: SC.ContainerView,

  // ..........................................................
  // METHODS
  //

  /**
    @param {SC.View} view
  */
  scrollToVisible: function (view) {
    // if no view is passed, do default
    if (arguments.length === 0) return arguments.callee.base.apply(this,arguments);

    var contentView = this.get('contentView');
    if (!contentView) return NO; // nothing to do if no contentView.

    // get the frame for the view - should work even for views with static
    // layout, assuming it has been added to the screen.
    var vf = view.get('frame');
    if (!vf) return NO; // nothing to do

    // convert view's frame to an offset from the contentView origin.  This
    // will become the new scroll offset after some adjustment.
    vf = contentView.convertFrameFromView(vf, view.get('parentView'));

    var vscroll2 = this.get('verticalScrollerView2');
    if (vscroll2 && vscroll2.get('isVisible')) {
      vf.height += vscroll2.get('frame').height;
    }

    var vscroll = this.get('verticalScrollerView');
    if (vscroll && vscroll.get('isVisible')) {
      vf.top -= vscroll.get('frame').height;
    }

    return this.scrollToRect(vf);
  },

  /** @private
    Adjusts the layout for the various internal views.  This method is called
    once when the scroll view is first configured and then anytime a scroller
    is shown or hidden.  You can call this method yourself as well to retile.

    You may also want to override this method to handle layout for any
    additional controls you have added to the view.
  */
  tile: function () {
    // get vertical scroller/determine if we should have a scroller
    var hasScroller, vscroll, vscroll2, hasVertical, clip, clipLayout, viewportHeight;
    hasScroller = this.get('hasVerticalScroller');
    vscroll = hasScroller ? this.get('verticalScrollerView') : null;
    vscroll2 = hasScroller ? this.get('verticalScrollerView2') : null;
    hasVertical = vscroll && this.get('isVerticalScrollerVisible');

    // get the containerView
    clip = this.get('containerView');
    clipLayout = { left: 0, top: 0 };

    if (hasVertical) {
      viewportHeight = 0;
      var scrollerThickness = vscroll.get('scrollerThickness') || vscroll2.get('scrollerThickness');
      var view   = this.get('contentView'),
            f      = (view) ? view.get('frame') : null,
            height = (f) ? f.height : 0,
            elem = this.containerView.$()[0],
            verticalOffset = this.get('verticalScrollOffset'),
            topArrowInvisible = { height: 0, top: 0, right: 0, left: 0 },
            topArrowVisible = { height: scrollerThickness, top: 0, right: 0, left: 0 },
            bottomArrowVisible = { height: scrollerThickness, bottom: 0, right: 0, left: 0 },
            bottomArrowInvisible = { height: 0, bottom: 0, right: 0, left: 0 };

      if (elem) viewportHeight = elem.offsetHeight;

      if (verticalOffset === 0) {
        clipLayout.top = 0;
        clipLayout.bottom = scrollerThickness;
        vscroll.set('layout', topArrowInvisible);
        vscroll2.set('layout', bottomArrowVisible);
      } else if (verticalOffset >= (height - viewportHeight - scrollerThickness)) {
        clipLayout.top = scrollerThickness;
        clipLayout.bottom = 0;
        vscroll.set('layout', topArrowVisible);
        vscroll2.set('layout', bottomArrowInvisible);
      } else {
        clipLayout.top = scrollerThickness;
        clipLayout.bottom = scrollerThickness;
        vscroll.set('layout', topArrowVisible);
        vscroll2.set('layout', bottomArrowVisible);
      }
    }

    if (vscroll) {
      vscroll.set('isVisible', hasVertical);
      vscroll2.set('isVisible', hasVertical);
    }

    clip.set('layout', clipLayout);
  },

  /** @private
    Called whenever a scroller visibility changes.  Calls the tile() method.
  */
  scrollerVisibilityDidChange: function () {
    this.tile();
  }.observes('isVerticalScrollerVisible', 'isHorizontalScrollerVisible', 'verticalScrollOffset'),


  // ..........................................................
  // INTERNAL SUPPORT
  //

  /** @private
    Instantiate scrollers & container views as needed.  Replace their classes
    in the regular properties.
  */
  createChildViews: function () {
    var childViews = [], view, view2, controlSize = this.get('controlSize');

    // create the containerView.  We must always have a container view.
    // also, setup the contentView as the child of the containerView...
    if (SC.none(view = this.containerView)) view = SC.ContainerView;

    childViews.push(this.containerView = this.createChildView(view, {
      contentView: this.contentView
    }));

    // and replace our own contentView...
    this.contentView = this.containerView.get('contentView');

    // create a vertical scroller
    if ((view = this.verticalScrollerView) && (view2 = this.verticalScrollerView2)) {
      if (this.get('hasVerticalScroller')) {
        view = this.verticalScrollerView = this.createChildView(view, {
          layout: {top: 0, left: 0, right: 0},
          controlSize: controlSize,
          valueBinding: '*owner.verticalScrollOffset'
        });
        childViews.push(view);
        view2 = this.verticalScrollerView2 = this.createChildView(view2, {
          scrollDown: YES,
          layout: { bottom: 0, left: 0, right: 0 },
          controlSize: controlSize,
          valueBinding: '*owner.verticalScrollOffset'
        });
        childViews.push(view2);
      } else {
        this.verticalScrollerView = null;
        this.verticalScrollerView2 = null;
      }
    }

    // set childViews array.
    this.childViews = childViews;

    this.contentViewFrameDidChange(); // setup initial display...
    this.tile(); // set up initial tiling
  },

  /** @private */
  init: function () {
    arguments.callee.base.apply(this,arguments);

    // start observing initial content view.  The content view's frame has
    // already been setup in prepareDisplay so we don't need to call
    // viewFrameDidChange...
    this._scroll_contentView = this.get('contentView');
    var contentView = this._scroll_contentView;

    if (contentView) {
      contentView.addObserver('frame', this, this.contentViewFrameDidChange);
    }

    if (this.get('isVisibleInWindow')) this._scsv_registerAutoscroll();
  },

  /** @private Registers/deregisters view with SC.Drag for autoscrolling */
  _scsv_registerAutoscroll: function () {
    if (this.get('isVisibleInWindow')) SC.Drag.addScrollableView(this);
    else SC.Drag.removeScrollableView(this);
  }.observes('isVisibleInWindow'),

  /** @private
    Invoked whenever the contentView's frame changes.  This will update the
    scroller maximum and optionally update the scroller visibility if the
    size of the contentView changes.  We don't care about the origin since
    that is tracked separately from the offset values.
  */
  contentViewFrameDidChange: function () {
    var view   = this.get('contentView'), view2,
        f      = (view) ? view.get('frame') : null,
        width  = (f) ? f.width : 0,
        height = (f) ? f.height : 0,
        dim    = this.get('frame'),
        viewportHeight, elem;

    // cache out scroll settings...
    //if ((width === this._scroll_contentWidth) && (height === this._scroll_contentHeight)) return;
    this._scroll_contentWidth = width;
    this._scroll_contentHeight = height;

    if (this.get('hasVerticalScroller') && (view = this.get('verticalScrollerView')) && (view2 = this.get('verticalScrollerView2'))) {
      height -= 1; // accurately account for our layout
      // decide if it should be visible or not
      if (this.get('autohidesVerticalScroller')) {
        this.set('isVerticalScrollerVisible', height > dim.height);
      }
      height -= this.get('verticalScrollerBottom');
      viewportHeight = 0;
      elem = this.containerView.$()[0];
      if (elem) viewportHeight = elem.offsetHeight;
      height = height - viewportHeight;
      view.setIfChanged('maximum', height);
      view2.setIfChanged('maximum', height);
    }
  },

  /** @private
    Whenever the horizontal scroll offset changes, update the scrollers and
    edit the location of the contentView.
  */
  _scroll_horizontalScrollOffsetDidChange: function () {},

  /** @private
    Whenever the vertical scroll offset changes, update the scrollers and
    edit the location of the contentView.
  */
  _scroll_verticalScrollOffsetDidChange: function () {
    var offset = this.get('verticalScrollOffset');

    // update the offset for the contentView...
    var contentView = this.get('contentView');
    if (contentView) contentView.$().css('top', (0 - offset) + "px");

  }.observes('verticalScrollOffset')

});

/* >>>>>>>>>> BEGIN source/views/navigation.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require("views/workspace");

/**
  @static
  @type String
  @constant
*/
SC.TO_LEFT = "TOLEFT";

/**
  @static
  @type String
  @constant
*/
SC.TO_RIGHT = "TORIGHT";


/** @class

  NavigationView is very loosely based on UINavigationController:
  that is, it implements a push/pop based API. 
  
  NavigationView checks if the view is NavigationBuildable--that is, if it has 
  
  Views may specify a topToolbar or bottomToolbar property. These will become the
  top or bottom toolbars of the NavigationView (which is, incidentally, a WorkspaceView).
  
  Of course, this process is animated...
  
  @author Alex Iskander
  @extends SC.WorkspaceView
  @since SproutCore 1.4
*/
SC.NavigationView = SC.WorkspaceView.extend(
/** @scope SC.NavigationView.prototype */ {
  
  /** @private */
  _views: null,
  
  /** @private */
  _current: null,
  
  /**
    @type SC.View
    @default SC.View
  */
  navigationContentView: SC.View,
  
  /** @private */
  init: function() {
    arguments.callee.base.apply(this,arguments);
    this._views = [];
  },
  
  /** @private */
  createChildViews: function() {
    arguments.callee.base.apply(this,arguments);
    
    // get the content
    var content = this.get("navigationContentView");
    
    // instantiate if needed
    if (content.isClass) content = this.createChildView(content);
    
    // set internal values
    this._defaultContent = this.navigationContentView = content;
    
    // append to the content view
    this.contentView.appendChild(content);
  },
  
  /** @private */
  changeNavigationContent: function(view) {
    var top = null, bottom = null;
    
    // find top and bottom toolbars if we are setting it to a view
    if (view) {
      top = view.get("topToolbar"); 
      bottom = view.get("bottomToolbar");
    }
    
    // instantiate top if needed
    if (top && top.isClass) {
      view.set("topToolbar", top = top.create());
    }
    
    // and now bottom
    if (bottom && bottom.isClass) {
      view.set("bottomToolbar", bottom = bottom.create());
    }
    
    
    // batch property changes for efficiency
    this.beginPropertyChanges();
    
    // update current, etc. etc.
    this._current = view;
    this.set("navigationContentView", view ? view : this._defaultContent);
    
    // set the top/bottom appropriately
    this.set("topToolbar", top);
    this.set("bottomToolbar", bottom);
    
    // and we are done
    this.endPropertyChanges();
  },
  
  /**
    Pushes a view into the navigation view stack. The view may have topToolbar and bottomToolbar properties.
    
    @param {SC.View} view The view to display
  */
  push: function(view) {
    this._currentDirection = this._current ? SC.TO_LEFT : null;
    
    // add current view to the stack (if needed)
    if (this._current) this._views.push(this._current);
    
    // update content now...
    this.changeNavigationContent(view);
  },
  
  /**
    Pops the current view off the navigation view stack.
  */
  pop: function() {
    this._currentDirection = SC.TO_RIGHT;
    
    // pop the view
    var view = this._views.pop();
    
    // set new (old) content view
    this.changeNavigationContent(view);
  },
  
  /**
    Pops to the specified view on the navigation view stack; the view you pass will become the current view.
    
    @param {SC.View} toView The view to display
  */
  popToView: function(toView) {
    this._currentDirection = SC.TO_RIGHT;
    var views = this._views,
        idx = views.length - 1, 
        view = views[idx];
    
    // loop back from end
    while (view && view !== toView) {
      this._views.pop();
      idx--;
      view = views[idx];
    }
    
    // and change the content
    this.changeNavigationContent(view);
  },
  
  /** @private */
  topToolbarDidChange: function() {
    var active = this.activeTopToolbar, replacement = this.get("topToolbar");
    
    // if we have an active toolbar, set the build direction and build out
    if (active) {
      if (this._currentDirection !== null) {
        active.set("buildDirection", this._currentDirection);
        this.buildOutChild(active);
      } else {
        this.removeChild(active);
      }
    }
    
    // if we have a new toolbar, set the build direction and build in
    if (replacement) {
      if (this._currentDirection !== null) {
        replacement.set("buildDirection", this._currentDirection);
        this.buildInChild(replacement);
      } else {
        this.appendChild(replacement);
      }
    }
    
    // update, and queue retiling
    this.activeTopToolbar = replacement;
    this.invokeOnce("childDidChange");
  }.observes("topToolbar"),
  
  /** @private */
  bottomToolbarDidChange: function() {
    var active = this.activeBottomToolbar, replacement = this.get("bottomToolbar");
    
    if (active) {
      if (this._currentDirection !== null) {
        active.set("buildDirection", this._currentDirection);
        this.buildOutChild(active);
      } else {
        this.removeChild(active);
      }
    }
    if (replacement) {
      if (this._currentDirection !== null) {
        replacement.set("buildDirection", this._currentDirection);
        this.buildInChild(replacement);
      } else {
        this.appendChild(replacement);
      }
    }
    
    this.activeBottomToolbar = replacement;
    this.invokeOnce("childDidChange");
  }.observes("topToolbar"),
  
  /** @private */
  contentViewDidChange: function() {
    var active = this.activeNavigationContentView, replacement = this.get("navigationContentView");
    
    // mix in navigationbuilder if needed
    if (!replacement.isNavigationBuilder) {
      replacement.mixin(SC.NavigationBuilder);
    }
    
    // tiling really needs to happen _before_ animation
    // so, we set "pending" and queue tiling.
    this._pendingBuildOut = active;
    this._pendingBuildIn = replacement;
    
    this.activeNavigationContentView = replacement;
    this.invokeOnce("childDidChange");
  }.observes("navigationContentView"),
  
  /** @private */
  childDidChange: function() {
    var replacement = this._pendingBuildIn, active = this._pendingBuildOut;
    if (active) {
      if (this._currentDirection !== null) {
        active.set("buildDirection", this._currentDirection);
        this.contentView.buildOutChild(active);
      } else {
        this.contentView.removeChild(active);
      }
    }

    this._scws_tile();
    
    if (replacement) {
      if (this._currentDirection !== null) {
        replacement.set("buildDirection", this._currentDirection);
        this.contentView.buildInChild(replacement);
      } else {
        this.contentView.appendChild(replacement);
      }
    }
  }
  
});

/* >>>>>>>>>> BEGIN source/views/navigation_bar.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require("views/toolbar");

/** @class
  NavigationBars do Great Things. They transition themselves (fade in/out) and
  all children (swoosh left/right). They accept isSwipeLeft and isSwipeRight views
  that handle, well, swiping. In short, they are neat.
  
  @extends SC.ToolbarView
  @extends SC.Gesturable
  @since SproutCore 1.0
*/
SC.NavigationBarView = SC.ToolbarView.extend(SC.Gesturable,
/** @scope SC.NavigationBarView.prototype */{

  /** @private */
  init: function() {
    arguments.callee.base.apply(this,arguments);
    
    if (!SC.Animatable) {
      SC.Logger.error(
        "NavigationBarView requires SC.Animatable. " +
        "Please make your app or framework require the animation framework. CRASH."
      );
    }
  },

  /** @private */
  mixinAnimatable: function() {
    this.mixin(SC.Animatable);
    this.transitions = this.navigationTransitions;
  },
  
  /**
    The default navigation transitions.
  */
  navigationTransitions: { 
    opacity: {
      duration: 0.25, action: "didFinishTransition"
    } 
  },
  
  /**
    The default style (opacity is 1)
  */
  style: {
    opacity: 1
  },
  

  // ..........................................................
  // Gesture Support
  // 
  
  /** @private */
  gestures: ["swipeGesture"],
  
  /** @private */
  swipeGesture: SC.SwipeGesture,

  /** @private */
  swipe: function(gesture, touch, direction) {
    var lookingFor = (direction === SC.SWIPE_LEFT) ? "isSwipeLeft" : "isSwipeRight",
        cv = this.get("childViews"), 
        child, idx, len = cv.get("length");
    
    // loop through the children
    for (idx = 0; idx < len; idx++) {
      child = cv[idx];
      
      // see if this is the view we are looking for
      if (child.get(lookingFor)) {
        // just give it touch responder and end right away, just like ScrollView. Good times, eh?
        touch.makeTouchResponder(child);
        touch.end();
        return;
      }
    }
    
  },
  
  
  // ..........................................................
  // View Build Support
  // 
  
  /** @private */
  resetBuild: function() {
    if (!this.isAnimatable) this.mixinAnimatable();
  },
  
  /** @private */
  didFinishTransition: function() {
    if (this.isBuildingIn) {
      // and please continue
      this.buildInDidFinish();
    } else if (this.isBuildingOut) this.buildOutDidFinish();
  },
  
  /** @private */
  preBuildIn: function() {
    // first, fade this view out
    this.disableAnimation();
    this.adjust("opacity", 0).updateLayout();
    this.enableAnimation();
    
    // now, loop over child views
    var cv = this.get("childViews"), child, idx, len = cv.get("length");
    for (idx = 0; idx < len; idx++) {
      child = cv[idx];
      
      // if the child disables navigation transitions, skip
      if (child.disableNavigationTransition) continue;
      
      // make sure the navigation stuff is mixed in as needed
      if (!child._nv_mixedIn) this.mixinNavigationChild(child);
      
      // now, set the initial state, which is either to the left or to the right 100px.
      child.disableAnimation();
      child.transform(this.buildDirection === SC.TO_LEFT ? 100  : -100);
      child.enableAnimation();
    }
  },
  
  /** @private */
  buildIn: function() {
    // first, we do the precursor
    this.preBuildIn();
    
    // then, we queue the actual animation
    this.invokeLater("startBuildIn", 10);
  },
  
  /** @private */
  startBuildIn: function() {
    this.adjust("opacity", 1);

    // get our frame, because we use it when computing child frames.
    var cv = this.get("childViews"), child, idx, len = cv.get("length");
    for (idx = 0; idx < len; idx++) {
      child = cv[idx];
      if (child.disableNavigationTransition) continue;
      child.transform(0);
    }
  },

  /** @private */
  buildOut: function() {
    this.adjust("opacity", 0);
    
    var cv = this.get("childViews"), child, idx, len = cv.get("length");
    for (idx = 0; idx < len; idx++) {
      child = cv[idx];
      if (child.disableNavigationTransition) continue;
      if (!child._nv_mixedIn) this.mixinNavigationChild(child);
      child.transform(this.buildDirection === SC.TO_LEFT ? -100  : 100);
    }
  },
  
  /** @private */
  mixinNavigationChild: function(child) {
    if (child.isAnimatable) return;
    
    // mix in animatable
    child.mixin(SC.Animatable);
    
    // mix in the transitions (and the "natural" layout)
    child.mixin({
      transitions: {
        transform: {timing: SC.Animatable.TRANSITION_EASE_IN_OUT, duration: 0.25}
      },
      naturalLayout: child.get("layout"),
      transform: function(pos) {
        if (SC.platform.supportsCSS3DTransforms) {
          this.adjust("transform", "translate3d(" + pos + "px,0px,0px)");
        } else {
          this.adjust("transform", "translate(" + pos + "px,0px)");          
        }
      }
    });
    
    // and mark as having mixed in.
    child._nv_mixedIn = YES;
  }
});
/* >>>>>>>>>> BEGIN source/views/popup_button.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('views/button');

/** @class

  SC.PopupButtonView displays a pop-up menu when clicked, from which the user
  can select an item.

  To use, create the SC.PopupButtonView as you would a standard SC.ButtonView,
  then set the menu property to an instance of SC.MenuPane. For example:

      SC.PopupButtonView.design({
        layout: { width: 200, height: 18 },
        menuBinding: 'MyApp.menuController.menuPane'
      });

  You would then have your MyApp.menuController return an instance of the menu
  to display.

  @extends SC.ButtonView
  @author Santosh Shanbhogue
  @author Tom Dale
  @copyright 2008-2011, Strobe Inc. and contributors.
  @version 1.0
*/
SC.PopupButtonView = SC.ButtonView.extend(
/** @scope SC.PopupButtonView.prototype */ {

  /**
    @type Array
    @default ['sc-popup-button']
    @see SC.View#classNames
  */
  classNames: ['sc-popup-button'],

  /**
    @type String
    @default 'popupButtonRenderDelegate'
  */
  renderDelegateName: 'popupButtonRenderDelegate',


  // ..........................................................
  // PROPERTIES
  //

  /**
    The prefer matrix to use when displaying the menu.

    @property
  */
  preferMatrix: null,

  /**
    The SC.MenuPane that should be displayed when the button is clicked.

    @type {SC.MenuPane}
    @default null
  */
  menu: null,

  /**
    If YES and the menu is a class, this will cause a task that will instantiate the menu
    to be added to SC.backgroundTaskQueue.

    @type Boolean
    @default NO
  */
  shouldLoadInBackground: NO,

  // ..........................................................
  // INTERNAL SUPPORT
  //

  /** @private
    If necessary, adds the loading of the menu to the background task queue.
  */
  init: function() {
    arguments.callee.base.apply(this,arguments);
    this._setupMenu();
    if (this.get('shouldLoadInBackground')) {
      SC.backgroundTaskQueue.push(SC.PopupButtonMenuLoader.create({ popupButton: this }));
    }
  },

  /** @private
    Sets up binding on the menu, removing any old ones if necessary.
  */
  _setupMenu: function() {
    var menu = this.get('instantiatedMenu');

    // clear existing bindings
    if (this.isActiveBinding) this.isActiveBinding.disconnect();
    this.isActiveBinding = null;

    // if there is a menu
    if (menu && !menu.isClass) {
      this.isActiveBinding = this.bind('isActive', menu, 'isVisibleInWindow');
    }
  },

  /** @private
    Setup the bindings for menu...
  */
  _popup_menuDidChange: function() {
    this._setupMenu();
  }.observes('menu'),

  /** @private
    isActive is NO, but when the menu is instantiated, it is bound to the menu's isVisibleInWindow property.
  */
  isActive: NO,

  /** @private
    Instantiates the menu if it is not already instantiated.
  */
  _instantiateMenu: function() {
    // get menu
    var menu = this.get('menu');

    // if it is already instantiated or does not exist, we cannot do anything
    if (!menu || !menu.isClass) return;

    // create
    this.menu = menu.create();

    // setup
    this._setupMenu();
  },

  /** @private
    The guaranteed-instantiated menu.
  */
  instantiatedMenu: function() {
    // get the menu
    var menu = this.get('menu');

    // if it is a class, we need to instantiate it
    if (menu && menu.isClass) {
      // do so
      this._instantiateMenu();

      // get the new version of the local
      menu = this.get('menu');
    }

    // return
    return menu;
  }.property('menu').cacheable(),

  /** @private
    Displays the menu.

    @param {SC.Event} evt
  */
  action: function(evt) {
    var menu = this.get('instantiatedMenu') ;

    if (!menu) {
      
      SC.Logger.warn("SC.PopupButton - Unable to show menu because the menu property is set to %@.".fmt(menu));
      
      return NO ;
    }

    menu.popup(this, this.get('preferMatrix')) ;
    return YES;
  },

  /** @private
    On mouse down, we set the state of the button, save some state for further
    processing, then call the button's action method.

    @param {SC.Event} evt
    @returns {Boolean}
  */
  mouseDown: function(evt) {
    // If disabled, handle mouse down but ignore it.
    if (!this.get('isEnabledInPane')) return YES ;

    this._isMouseDown = YES;

    this._action() ;

    // Store the current timestamp. We register the timestamp after a setTimeout
    // so that the menu has been rendered, in case that operation
    // takes more than a few hundred milliseconds.

    // One mouseUp, we'll use this value to determine how long the mouse was
    // pressed.

    // we need to keep track that we opened it just now in case we get the
    // mouseUp before render finishes. If it is 0, then we know we have not
    // waited long enough.
    this._menuRenderedTimestamp = 0;

    var self = this;

    // setTimeout guarantees that all rendering is done. The browser will even
    // have rendered by this point.
    setTimeout(function() {
      SC.run(function(){
        // a run loop might be overkill here but what if Date.now fails?
        self._menuRenderedTimestamp = Date.now();
      });
    }, 1);

    this.becomeFirstResponder();

    return YES ;
  },

  /** @private
    Because we responded YES to the mouseDown event, we have responsibility
    for handling the corresponding mouseUp event.

    However, the user may click on this button, then drag the mouse down to a
    menu item, and release the mouse over the menu item. We therefore need to
    delegate any mouseUp events to the menu's menu item, if one is selected.

    We also need to differentiate between a single click and a click and hold.
    If the user clicks and holds, we want to close the menu when they release.
    Otherwise, we should wait until they click on the menu's modal pane before
    removing our active state.

    @param {SC.Event} evt
    @returns {Boolean}
  */
  mouseUp: function(evt) {
    var timestamp = new Date().getTime(),
        previousTimestamp = this._menuRenderedTimestamp,
        menu = this.get('instantiatedMenu'),
        touch = SC.platform.touch,
        targetMenuItem;

    // normalize the previousTimestamp: if it is 0, it might as well be now.
    // 0 means that we have not even triggered the nearly-immediate saving of timestamp.
    if (previousTimestamp === 0) previousTimestamp = Date.now();

    if (menu) {
      // Get the menu item the user is currently hovering their mouse over
      targetMenuItem = menu.getPath('rootMenu.targetMenuItem');

      if (targetMenuItem) {
        // Have the menu item perform its action.
        // If the menu returns NO, it had no action to
        // perform, so we should close the menu immediately.
        if (!targetMenuItem.performAction()) menu.remove();
      } else {
        // If the user waits more than certain amount of time between
        // mouseDown and mouseUp, we can assume that they are clicking and
        // dragging to the menu item, and we should close the menu if they
        //mouseup anywhere not inside the menu.
        if (!touch && (timestamp - previousTimestamp > SC.ButtonView.CLICK_AND_HOLD_DELAY)) {
          menu.remove();
        }
      }
    }

    // Reset state.
    this._isMouseDown = NO;
    arguments.callee.base.apply(this,arguments);
    return YES;
  },

  /** @private
    Overrides ButtonView's mouseExited method to remove the behavior where the
    active state is removed on mouse exit. We want the button to remain active
    as long as the menu is visible.

    @param {SC.Event} evt
    @returns {Boolean}
  */
  mouseExited: function(evt) {
    return YES;
  },

  /** @private
    Overrides performKeyEquivalent method to pass any keyboard shortcuts to
    the menu.

    @param {String} charCode string corresponding to shortcut pressed (e.g.,
    alt_shift_z)
    @param {SC.Event} evt
  */
  performKeyEquivalent: function(charCode, evt) {
    if (!this.get('isEnabledInPane')) return NO ;
    var menu = this.get('instantiatedMenu') ;

    return (!!menu && menu.performKeyEquivalent(charCode, evt, YES)) ;
  },

  /** @private */
  touchStart: function(evt) {
    return this.mouseDown(evt);
  },

  /** @private */
  touchEnd: function(evt) {
    return this.mouseUp(evt);
  }

});

/**
  @private
  Handles lazy instantiation of popup button menu.
*/
SC.PopupButtonMenuLoader = SC.Task.extend({
  popupButton: null,
  run: function() {
    if (this.popupButton) this.popupButton._instantiateMenu();
  }
});

/* >>>>>>>>>> BEGIN source/views/progress.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


/**
  @class

  Displays a progress bar.  You can display both a defined and an
  indeterminate progressbar.  The progress bar itself is designed to be styled
  using CSS classes with the following structure:

      <div class="sc-progress-view"><div class="inner"></div></div>

  The outer can form the boundary of the bar while the inner will be adjusted
  to fit the percentage of the progress.

  Creating a ProgressView accepts a number of properties, for example:

      progressView: SC.ProgressView.design({
        value: 50,
        minimum: 0,
        maximum: 100,
        isIndeterminate: NO,
        isEnabled: YES
      })

  @extends SC.View
  @extends SC.Control
  @since SproutCore 1.0
*/
SC.ProgressView = SC.View.extend(SC.Control,
/** @scope SC.ProgressView.prototype */{

  /**
    @type Array
    @default ['sc-progress-view']
    @see SC.View#classNames
  */
  classNames: ['sc-progress-view'],

  /**
    @type Array
    @default ['displayValue', 'ariaValue', 'minimum', 'maximum', 'isIndeterminate', 'isRunning', 'isVisibleInWindow']
    @see SC.View#displayProperties
  */
  displayProperties: ['displayValue', 'ariaValue', 'minimum', 'maximum', 'isIndeterminate', 'isRunning', 'isVisibleInWindow'],

  /**
    @type String
    @default 'progressRenderDelegate'
  */
  renderDelegateName: 'progressRenderDelegate',

  // ........................................
  // PROPERTIES
  //

  /**
    Bind this to the current value of the progress bar.  Note that by default
    an empty value will disable the progress bar and a multiple value will make
    it indeterminate.

    @type Number
    @default 0.50
  */
  value: 0.50,

  /** @private */
  valueBindingDefault: SC.Binding.single().notEmpty(),

  /**
    @field
    @type Number
    @observes value
    @observes maximum
    @observes minimum
  */
  displayValue: function(){
    var minimum = this.get('minimum') || 0.0,
        maximum = this.get('maximum') || 1.0,
        value = this.get('value') || 0.0;
    value = (value - minimum) / (maximum - minimum);
    if (value > 1.0) value = 1.0;

    if(isNaN(value)) value = 0.0;
    // cannot be smaller then minimum
    if(value<minimum) value = 0.0;
    // cannot be larger then maximum
    if(value>maximum) value = 1.0;

    return value;
  }.property('value', 'maximum', 'minimum').cacheable(),

  /**
    The WAI-ARIA role for progress view.

    @type String
    @default 'progressbar'
    @readOnly
  */
  ariaRole: 'progressbar',

  /**
    The WAI-ARIA value for the progress view. This value will be passed to any
    rendering code as-is, not converted into percentages, etc. It is computed
    based on the original value property.

    @property
  */
  ariaValue: function() {
    return this.get('value');
  }.property('value').cacheable(),

  /**
    The minimum value of the progress.

    @type Number
    @default 0
  */
  minimum: 0,

  /** @private */
  minimumBindingDefault: SC.Binding.single().notEmpty(),

  /**
    Optionally specify the key used to extract the minimum progress value
    from the content object.  If this is set to null then the minimum value
    will not be derived from the content object.

    @type String
    @default null
  */
  contentMinimumKey: null,

  /**
    The maximum value of the progress bar.

    @type Number
    @default 1.0
  */
  maximum: 1.0,

  /** @private */
  maximumBindingDefault: SC.Binding.single().notEmpty(),

  /**
    Optionally specify the key used to extract the maximum progress value
    from the content object.  If this is set to null then the maximum value
    will not be derived from the content object.

    @type String
    @default null
  */
  contentMaximumKey: null,

  /**
    Set to true if the item in progress is indeterminate.  This may be
    overridden by the actual value.

    @type Boolean
    @default NO
  */
  isIndeterminate: NO,

  /** @private */
  isIndeterminateBindingDefault: SC.Binding.bool(),

  /**
    Set to YES when the process is currently running.  This will cause the
    progress bar to animate, especially if it is indeterminate.

    @type Boolean
    @default NO
  */
  isRunning: NO,

  /** @private */
  isRunningBindingDefault: SC.Binding.bool(),

  /**
    Optionally specify the key used to extract the isIndeterminate value
    from the content object.  If this is set to null then the isIndeterminate
    value will not be derived from the content object.

    @type String
    @default null
  */
  contentIsIndeterminateKey: null,

  // ........................................
  // INTERNAL SUPPORT
  //

  /** @private */
  contentPropertyDidChange: function(target, key) {
    var content = this.get('content');
    this.beginPropertyChanges()
      .updatePropertyFromContent('value', key, 'contentValueKey', content)
      .updatePropertyFromContent('minimum', key, 'contentMinimumKey', content)
      .updatePropertyFromContent('maximum', key, 'contentMaximumKey', content)
      .updatePropertyFromContent('isIndeterminate', key, 'contentIsIndeterminateKey', content)
    .endPropertyChanges();
  },

  /** @private */
  didCreateLayer: function() {
    // When using the JavaScript animation, we cannot start until the layer is
    // created.  Then if we are indeterminate, running and visible in the
    // window already, start animating.
    if (this.get('isIndeterminate') && this.get('isRunning') && this.get('isVisibleInWindow')) {
      this.displayDidChange();
    }
  }

});


/* >>>>>>>>>> BEGIN source/views/radio.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


/** @class

  A RadioView is used to create a group of radio buttons.  The user can use
  these buttons to pick from a choice of options.

  This view renders simulated radio buttons that can display a mixed state and
  has other features not found in platform-native controls.

  The radio buttons themselves are designed to be styled using CSS classes with
  the following structure:

      <label class="sc-radio-button">
        <img class="button" src="some_image.gif"/>
        <input type="radio" name="<sc-guid>" value=""/>
        <span class="sc-button-label">Label for button1</span>
      </label>

  Setting up a RadioView accepts a number of properties, for example:

      radio: SC.RadioView.design({
        items: [
          {
            title: "Red",
            value: "red",
            enabled: YES,
            icon: "button_red"
          },{
            title: "Green",
            value: "green",
            enabled: YES,
            icon: 'button_green'
          }
        ],
        value: 'red',
        itemTitleKey: 'title',
        itemValueKey: 'value',
        itemIconKey: 'icon',
        itemIsEnabledKey: 'enabled',
        isEnabled: YES,
        layoutDirection: SC.LAYOUT_HORIZONTAL
      })

  The items array can contain either strings, or as in the example above a
  hash. When using a hash, make sure to also specify the itemTitleKey
  and itemValueKey you are using. Similarly, you will have to provide
  itemIconKey if you are using icons radio buttons. The individual items
  enabled property is YES by default, and the icon is optional.

  @extends SC.View
  @extends SC.Control
  @since SproutCore 1.0
*/
SC.RadioView = SC.View.extend(SC.Control,
/** @scope SC.RadioView.prototype */{

  /**
    @field
    @type Boolean
    @default YES
    @observes isEnabled
  */
  acceptsFirstResponder: function() {
    if (SC.FOCUS_ALL_CONTROLS) { return this.get('isEnabledInPane'); }
    return NO;
  }.property('isEnabledInPane'),

  /**
    @type Array
    @default ['sc-radio-view']
    @see SC.View#classNames
  */
  classNames: ['sc-radio-view'],

  /**
    The WAI-ARIA role for a group of radio buttons.

    @type String
    @default 'radiogroup'
    @readOnly
  */
  ariaRole: 'radiogroup',

  /**
    @type Array
    @default ['displayItems', 'layoutDirection']
    @see SC.View#displayProperties
  */
  displayProperties: ['displayItems', 'layoutDirection'],

  /**
    @type String
    @default 'radioGroupRenderDelegate'
  */
  renderDelegateName: 'radioGroupRenderDelegate',

  // ..........................................................
  // Properties
  //

  /**
    If items property is a hash, specify which property will function as
    the ariaLabeledBy with this itemAriaLabeledByKey property.ariaLabeledBy is used
    as the WAI-ARIA attribute for the radio view. This property is assigned to
    'aria-labelledby' attribute, which defines a string value that labels the
    element. Used to support voiceover.  It should be assigned a non-empty string,
    if the 'aria-labelledby' attribute has to be set for the element.

    @type String
    @default null
  */
  itemAriaLabeledByKey: null,

  /**
    If items property is a hash, specify which property will function as
    the ariaLabeled with this itemAriaLabelKey property.ariaLabel is used
    as the WAI-ARIA attribute for the radio view. This property is assigned to
    'aria-label' attribute, which defines a string value that labels the
    element. Used to support voiceover.  It should be assigned a non-empty string,
    if the 'aria-label' attribute has to be set for the element.

    @type String
    @default null
  */
  itemAriaLabelKey: null,

  /**
    The value of the currently selected item, and which will be checked in the
    UI. This can be either a string or an array with strings for checking
    multiple values.

    @type Object|String
    @default null
  */
  value: null,

  /**
    This property indicates how the radio buttons are arranged. Possible values:

      - SC.LAYOUT_VERTICAL
      - SC.LAYOUT_HORIZONTAL

    @type String
    @default SC.LAYOUT_VERTICAL
  */
  layoutDirection: SC.LAYOUT_VERTICAL,

  /**
    @type Boolean
    @default YES
  */
  escapeHTML: YES,

  /**
    The items property can be either an array with strings, or a
    hash. When using a hash, make sure to also specify the appropriate
    itemTitleKey, itemValueKey, itemIsEnabledKey and itemIconKey.

    @type Array
    @default []
  */
  items: [],

  /**
    If items property is a hash, specify which property will function as
    the title with this itemTitleKey property.

    @type String
    @default null
  */
  itemTitleKey: null,

  /**
    If items property is a hash, specify which property will function as
    the item width with this itemWidthKey property. This is only used when
    layoutDirection is set to SC.LAYOUT_HORIZONTAL and can be used to override
    the default value provided by the framework or theme CSS.

    @type String
    @default null
  */
  itemWidthKey: null,

  /**
    If items property is a hash, specify which property will function as
    the value with this itemValueKey property.

    @type String
    @default null
  */
  itemValueKey: null,

  /**
    If items property is a hash, specify which property will function as
    the value with this itemIsEnabledKey property.

    @type String
    @default null
  */
  itemIsEnabledKey: null,

  /**
    If items property is a hash, specify which property will function as
    the value with this itemIconKey property.

    @type String
    @default null
  */
  itemIconKey: null,

  /**  @private
    If the items array itself changes, add/remove observer on item...
  */
  itemsDidChange: function() {
    if (this._items) {
      this._items.removeObserver('[]', this, this.itemContentDidChange);
    }
    this._items = this.get('items');
    if (this._items) {
      this._items.addObserver('[]', this, this.itemContentDidChange);
    }
    this.itemContentDidChange();
  }.observes('items'),

  /** @private
    Invoked whenever the item array or an item in the array is changed.
    This method will regenerate the list of items.
  */
  itemContentDidChange: function() {
    // Force regeneration of buttons
    this._renderAsFirstTime = YES;

    this.notifyPropertyChange('displayItems');
  },

  // ..........................................................
  // PRIVATE SUPPORT
  //

  /** @private
    Data Sources for radioRenderDelegates, as required by radioGroupRenderDelegate.
  */
  displayItems: function() {
    var items = this.get('items'),
        viewValue = this.get('value'),
        isArray = SC.isArray(viewValue),
        loc = this.get('localize'),
        titleKey = this.get('itemTitleKey'),
        valueKey = this.get('itemValueKey'),
        widthKey = this.get('itemWidthKey'),
        isHorizontal = this.get('layoutDirection') === SC.LAYOUT_HORIZONTAL,
        isEnabledKey = this.get('itemIsEnabledKey'),
        iconKey = this.get('itemIconKey'),
        ariaLabeledByKey = this.get('itemAriaLabeledByKey'),
        ariaLabelKey = this.get('itemAriaLabelKey'),
        ret = this._displayItems || [], max = (items)? items.get('length') : 0,
        item, title, width, value, idx, isEnabled, icon, sel, active,
        ariaLabeledBy, ariaLabel;

    for(idx=0;idx<max;idx++) {
      item = items.objectAt(idx);

      // if item is an array, just use the items...
      if (SC.typeOf(item) === SC.T_ARRAY) {
        title = item[0];
        value = item[1];

        // otherwise, possibly use titleKey,etc.
      } else if (item) {
        // get title.  either use titleKey or try to convert the value to a
        // string.
        if (titleKey) {
          title = item.get ? item.get(titleKey) : item[titleKey];
        } else title = (item.toString) ? item.toString() : null;

        if (widthKey && isHorizontal) {
          width = item.get ? item.get(widthKey) : item[widthKey];
        }

        if (valueKey) {
          value = item.get ? item.get(valueKey) : item[valueKey];
        } else value = item;

        if (isEnabledKey) {
          isEnabled = item.get ? item.get(isEnabledKey) : item[isEnabledKey];
        } else isEnabled = YES;

        if (iconKey) {
          icon = item.get ? item.get(iconKey) : item[iconKey];
        } else icon = null;

        if (ariaLabeledByKey) {
          ariaLabeledBy = item.get ? item.get(ariaLabeledByKey) : item[ariaLabeledByKey];
        } else ariaLabeledBy = null;

        if (ariaLabelKey) {
          ariaLabel = item.get ? item.get(ariaLabelKey) : item[ariaLabelKey];
        } else ariaLabel = null;

        // if item is nil, use some defaults...
      } else {
        title = value = icon = null;
        isEnabled = NO;
      }

      // it can only be enabled if the radio view itself is enabled
      isEnabled = isEnabled && this.get('isEnabled');

      if (item) {
        sel = (isArray) ? (viewValue.indexOf(value) >= 0) : (viewValue === value);
      } else {
        sel = NO;
      }

      // localize title if needed
      if (loc) title = SC.String.loc(title);
      ret.push(SC.Object.create({
        title: title,
        icon: icon,
        width: width,
        value: value,

        isEnabled: isEnabled,
        isSelected: (isArray && viewValue.indexOf(value) >= 0 && viewValue.length === 1) || (viewValue === value),
        isMixed: (isArray && viewValue.indexOf(value) >= 0),
        isActive: this._activeRadioButton === idx,
        theme: this.get('theme'),
        renderState: {}
      }));
    }

    return ret; // done!
  }.property('isEnabled', 'value', 'items', 'itemTitleKey', 'itemWidthKey', 'itemValueKey', 'itemIsEnabledKey', 'localize', 'itemIconKey','itemAriaLabeledByKey', 'itemAriaLabelKey').cacheable(),

  /** @private
    If the user clicks on of the items mark it as active on mouseDown unless
    is disabled.

    Save the element that was clicked on so we can remove the active state on
    mouseUp.
  */
  mouseDown: function(evt) {
    if (!this.get('isEnabledInPane')) return YES;

    var delegate = this.get('renderDelegate'), proxy = this.get('renderDelegateProxy'),
        elem = this.$(),
        index = delegate.indexForEvent(proxy, elem, evt);

    this._activeRadioButton = index;

    if (index !== undefined) {
      var item = this.get('displayItems')[index];
      if (item.get('isEnabled')) {
        item.set('isActive', YES);
        delegate.updateRadioAtIndex(proxy, elem, index);
      }
    }

    // even if radiobuttons are not set to get firstResponder, allow default
    // action, that way textfields loose focus as expected.
    evt.allowDefault();
    return YES;
  },

  /** @private
    If we have a radio element that was clicked on previously, make sure we
    remove the active state. Then update the value if the item clicked is
    enabled.
  */
  mouseUp: function(evt) {
    if (!this.get('isEnabledInPane')) return YES;

    var delegate = this.get('renderDelegate'), proxy = this.get('renderDelegateProxy'),
        elem = this.$(),
        displayItems = this.get('displayItems'),
        index = delegate.indexForEvent(proxy, elem, evt);

    if (this._activeRadioButton !== undefined && index !== this._activeRadioButton) {
      displayItems[this._activeRadioButton].set('isActive', NO);
      delegate.updateRadioAtIndex(proxy, elem, this._activeRadioButton);
    }

    this._activeRadioButton = undefined;

    if (index !== undefined) {
      var item = this.get('displayItems')[index];
      if (item.get('isEnabled')) {
        item.set('isActive', NO);
        delegate.updateRadioAtIndex(proxy, elem, index);
        this.set('value', item.value);
      }
    }

    evt.allowDefault();
    return YES;
  },

  keyDown: function(evt) {
    if(!this.get('isEnabledInPane')) return YES;
    // handle tab key
    if (evt.which === 9 || evt.keyCode === 9) {
      var view = evt.shiftKey ? this.get('previousValidKeyView') : this.get('nextValidKeyView');
      if(view) view.becomeFirstResponder();
      else evt.allowDefault();
      return YES ; // handled
    }
    if (evt.which >= 37 && evt.which <= 40){

      var delegate = this.get('renderDelegate'), proxy = this.get('renderDelegateProxy'),
          elem = this.$(),
          displayItems = this.get('displayItems'),
          val = this.get('value');
      for(var i= 0, iLen = displayItems.length; i<iLen; i++){
        if(val === displayItems[i].value) break;
      }


      if (evt.which === 37 || evt.which === 38 ){
        if(i<=0) i = displayItems.length-1;
        else i--;
      }
      if (evt.which === 39 || evt.which === 40 ){
        if(i>=displayItems.length-1) i = 0;
        else i++;
      }
      delegate.updateRadioAtIndex(proxy, elem, i);
      this.set('value', displayItems[i].value);
    }
    evt.allowDefault();

    return NO;
  },


  /** @private */
  touchStart: function(evt) {
    return this.mouseDown(evt);
  },

  /** @private */
  touchEnd: function(evt) {
    return this.mouseUp(evt);
  }

});

/* >>>>>>>>>> BEGIN source/views/scene.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/** @class

  This view was significantly more limited than what can be achieved
  using the new transition plugins in SproutCore 1.10.  Please use the
  `transition` property in SC.ContainerView for animating between
  views.

  @extends SC.ContainerView
  @deprecated Version 1.10
  @see SC.ContainerView#transition
  @since Version 1.0
*/
SC.SceneView = SC.ContainerView.extend(
/** @scope SC.SceneView.prototype */ {

  
  init: function () {
    arguments.callee.base.apply(this,arguments);

    SC.warn("Developer Warning: SC.SceneView has been deprecated.  Please use the transition property of SC.ContainerView for animated view swapping.");
  },
  

  /**
    Array of scene names.  Scenes will slide on and off screen in the order
    that you specify them here.  That is, if you shift from a scene at index
    2 to a scene at index 1, the scenes will animation backwards.  If you
    shift to a scene at index 3, the scenes will animate forwards.

    @type Array
    @default ['master', 'detail']
  */
  scenes: ['master', 'detail'],

  /**
    The currently showing scene.  Changing this property will cause the
    scene view to transition to the new scene.  If you set this property to
    null, an empty string, or a non-existent scene, then the scene will appear
    empty.

    @type String
    @default null
  */
  nowShowing: null,

  /**
    Speed of transition.  Should be expressed in msec.

    @type Number
    @default 200
  */
  transitionDuration: 200,

  /** @private */
  _state: 'NO_VIEW', // no view

  /** @private
    Whenever called to change the content, save the nowShowing state and
    then animate in by adjusting the layout.
  */
  replaceContent: function(content) {
    if (content && this._state===this.READY) this.animateScene(content);
    else this.replaceScene(content);
    return this ;
  },

  /** @private
    Invoked whenever we just need to swap the scenes without playing an
    animation.
  */
  replaceScene: function(newContent) {
    var oldContent = this._targetView,
        layout     = this.STANDARD_LAYOUT,
        scenes     = this.get('scenes'),
        idx        = scenes ? scenes.indexOf(this.get('nowShowing')) : -1;

    // cleanup animation here too..
    this._targetView = newContent ;
    this._targetIndex  = idx;

    if (this._timer) this._timer.invalidate();
    this._leftView = this._rightView = this._start = this._end = null;
    this._timer = null;


    this.removeAllChildren();

    if (oldContent) oldContent.set('layout', layout);
    if (newContent) newContent.set('layout', layout);

    if (newContent) this.appendChild(newContent);
    this._state = newContent ? this.READY : this.NO_VIEW ;
  },

  /** @private
    Invoked whenever we need to animate in the new scene.
  */
  animateScene: function(newContent) {
    var oldContent = this._targetView,
        outIdx     = this._targetIndex,
        scenes     = this.get('scenes'),
        inIdx      = scenes ? scenes.indexOf(this.get('nowShowing')) : -1,
        layout;

    if (outIdx<0 || inIdx<0 || outIdx===inIdx) {
      return this.replaceScene(newContent);
    }

    this._targetView = newContent ;
    this._targetIndex = inIdx;

    // save some info needed for animation
    if (inIdx > outIdx) {
      this._leftView  = oldContent;
      this._rightView = newContent;
      this._target    = -1;
    } else {
      this._leftView  = newContent ;
      this._rightView = oldContent ;
      this._target    = 1 ;
    }

    // setup views
    this.removeAllChildren();

    if (oldContent) this.appendChild(oldContent)
    if (newContent) this.appendChild(newContent);

    // setup other general state
    this._start   = Date.now();
    this._end     = this._start + this.get('transitionDuration');
    this._state   = this.ANIMATING;
    this.tick();
  },

  /** @private
    Called while the animation runs.  Compute the new layout for
    the left and right views based on the portion completed.  When we finish
    call replaceScene().
  */
  tick: function() {
    this._timer = null ; // clear out

    var now    = Date.now(),
        pct    = (now-this._start)/(this._end-this._start),
        target = this._target,
        left   = this._leftView,
        right  = this._rightView,
        layout, adjust;

    if (pct<0) pct = 0;

    // if we're done or the view is no longer visible, just replace the
    // scene.
    if (!this.get('isVisibleInWindow') || (pct>=1)) {
      return this.replaceScene(this._targetView);
    }

    // ok, now let's compute the new layouts for the two views and set them
    layout = SC.clone(this.get('frame'));
    adjust = Math.floor(layout.width * pct);

    // set the layout for the views, depending on the direction
    if (target>0) {
      layout.left = 0-(layout.width-adjust);
      left.set('layout', layout);

      layout = SC.clone(layout);
      layout.left = adjust ;
      right.set('layout', layout);

    } else {
      layout.left = 0-adjust ;
      left.set('layout', layout);

      layout = SC.clone(layout);
      layout.left = layout.width-adjust;
      right.set('layout', layout);
    }

    this._timer = this.invokeLater(this.tick, 20);
    return this;
  },


  /** @private */
  NO_VIEW: 'NO_VIEW',

  /** @private */
  ANIMATING: 'ANIMATING',

  /** @private */
  READY: 'READY',

  /** @private
    Standard layout assigned to views at rest
  */
  STANDARD_LAYOUT: { top: 0, left: 0, bottom: 0, right: 0 }

});

/* >>>>>>>>>> BEGIN source/views/segment.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/**
  @class

  SegmentViews are the views used and arranged by SC.SegmentedView and are very similar to a SC.ButtonView
  without any event handling.  The event handling is done by the parent view.

  @extends SC.View
  @since SproutCore 1.5
*/
SC.SegmentView = SC.View.extend(SC.Control,
/** @scope SC.SegmentView.prototype */{

  /**
    @type String
    @default 'tab'
    @readOnly
  */
  //ariaRole: 'tab',
  ariaRole: 'button', // workaround for <rdar://problem/10444670>; switch back to 'tab' later with <rdar://problem/10463928> (also see segmented.js)

  /**
    @type Boolean
    @default YES
    @readOnly
  */
  isSegment: YES,

  /**
    @type Array
    @default ['sc-segment-view']
    @see SC.View#classNames
  */
  classNames: ['sc-segment-view'],

  /**
    @type String
    @default null
    @see SC.View#toolTip
  */
  toolTip: null,

  /**
    @type Boolean
    @default NO
    @see SC.Control#isActive
  */
  isActive: NO,

  /**
    @type Boolean
    @default NO
    @see SC.Control#isSelected
  */
  isSelected: NO,

  /**
    Change the layout direction to make this a vertical segment instead of horizontal ones.
    Possible values:

      - SC.LAYOUT_HORIZONTAL
      - SC.LAYOUT_VERTICAL

    @type String
    @default SC.LAYOUT_HORIZONTAL
  */
  layoutDirection: SC.LAYOUT_HORIZONTAL,

  /**
    @type String
    @default null
    @see SC.Control#controlSize
  */
  controlSize: null,

  /**
    @type Boolean
    @default NO
    @see SC.ButtonView#supportFocusRing
  */
  supportFocusRing: NO,

  // TODO: isDefault, isCancel, value not really used by render delegate
  displayProperties: ['icon', 'displayTitle', 'value', 'displayToolTip', 'isDefault', 'isCancel', 'width', 'isSegment','isFirstSegment', 'isMiddleSegment', 'isLastSegment', 'isOverflowSegment', 'index', 'layoutDirection'],

  /**
    @type String
    @default 'segmentRenderDelegate'
  */
  renderDelegateName: 'segmentRenderDelegate',

  /**
    @type Boolean
    @default YES
  */
  useStaticLayout: YES,


  // ..........................................................
  // Properties
  //

  /**
    @type String
    @default ""
  */
  title: "",

  /**
    @type Object
    @default null
  */
  value: null,

  /**
    @type String
    @default null
  */
  icon: null,

  /**
    @type Boolean
    @default null
  */
  localize: NO,

  /**
    @type String
    @default null
  */
  keyEquivalent: null,

  // TODO: Modification currently unsupported in SegmentedView
  /**
    @type Boolean
    @default YES
  */
  escapeHTML: YES,

  // TODO: Modification currently unsupported in SegmentedView
  /**
    @type Boolean
    @default YES
  */
  needsEllipsis: YES,

  /**
    Localized title.

    @field
    @type String
    @default ""
  */
  displayTitle: function() {
    var ret = this.get('title');
    if (this.get('localize')) ret = SC.String.loc(ret);
    return ret;
  }.property('title', 'localize').cacheable(),

  /**
    @type Number
    @default null
  */
  width: null,

  /**
    The item represented by this view.

    @type Object
    @default null
  */
  localItem: null,

  /** @private
    Whenever the width property changes, adjust our layout accordingly.
  */
  widthDidChange: function() {
    this.adjust('width', this.get('width'));
  }.observes('width'),

  /** @private
    Update our properties according to our matching item.
  */
  updateItem: function(parentView, item) {
    var itemKeys = parentView.get('itemKeys'),
        itemKey,
        viewKeys = parentView.get('viewKeys'),
        viewKey,
        i;

    for (i = itemKeys.get('length') - 1; i >= 0; i--) {
      itemKey = parentView.get(itemKeys.objectAt(i));
      viewKey = viewKeys.objectAt(i);

      // Don't overwrite the default value if none exists in the item
      if (!SC.none(item.get(itemKey))) this.set(viewKey, item.get(itemKey));
    }

    this.set('localItem', item);
  }
});

/* >>>>>>>>>> BEGIN source/views/segmented.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('views/segment');

/**
  @class

  SegmentedView is a special type of button that can display multiple
  segments.  Each segment has a value assigned to it.  When the user clicks
  on the segment, the value of that segment will become the new value of
  the control.

  You can also optionally configure a target/action that will fire whenever
  the user clicks on an item.  This will give your code an opportunity to take
  some action depending on the new value.  (of course, you can always bind to
  the value as well, which is generally the preferred approach.)

  # Defining Your Segments

  You define your segments by providing a items array, much like you provide
  to a RadioView.  Your items array can be as simple as an array of strings
  or as complex as full model objects.  Based on how you configure your
  itemKey properties, the segmented view will read the properties it needs
  from the array and construct the button.

  You can define the following properties on objects you pass in:

    - *itemTitleKey* - the title of the button
    - *itemValueKey* - the value of the button
    - *itemWidthKey* - the preferred width. if omitted, it autodetects
    - *itemIconKey*  - an icon
    - *itemActionKey* - an optional action to fire when pressed
    - *itemTargetKey* - an optional target for the action
    - *itemLayerIdKey* - an optional target for the action
    - *segmentViewClass* - class to be used for creating segments

  @extends SC.View
  @extends SC.Control
  @since SproutCore 1.0
*/
SC.SegmentedView = SC.View.extend(SC.Control,
/** @scope SC.SegmentedView.prototype */ {

  /**
    @ field
    @type Boolean
    @default YES
  */
  acceptsFirstResponder: function () {
    if (SC.FOCUS_ALL_CONTROLS) { return this.get('isEnabledInPane'); }
    return NO;
  }.property('isEnabledInPane').cacheable(),

  /**
    @type String
    @default 'tablist'
    @readOnly
  */
  //ariaRole: 'tablist',
  ariaRole: 'group', // workaround for <rdar://problem/10444670>; switch back to 'tablist' later with <rdar://problem/10463928> (also see segment.js)

  /**
    @type Array
    @default ['sc-segmented-view']
    @see SC.View#classNames
  */
  classNames: ['sc-segmented-view'],

  /**
    @type String
    @default 'square'
    @see SC.ButtonView#theme
  */
  theme: 'square',

  /**
    The value of the segmented view.

    The SegmentedView's value will always be the value of the currently
    selected button or buttons.  Setting this value will change the selected
    button or buttons.

    If you set this value to something that has no matching button, then
    no buttons will be selected.

    Note: if allowsMultipleSelection is set to true, then the value must be
    an Array.

    @type Object | Array
    @default null
  */
  value: null,

  /**
    If YES, clicking a selected button again will deselect it, setting the
    segmented views value to null.

    @type Boolean
    @default NO
  */
  allowsEmptySelection: NO,

  /**
    If YES, then clicking on a tab will not deselect the other segments, it
    will simply add or remove it from the selection.

    @type Boolean
    @default NO
  */
  allowsMultipleSelection: NO,

  /**
    If YES, it will set the segment value even if an action is defined.

    @type Boolean
    @default NO
  */
  selectSegmentWhenTriggeringAction: NO,

  /**
    @type Boolean
    @default YES
  */
  localize: YES,

  /**
    Aligns the segments of the segmented view within its frame horizontally.
    Possible values:

      - SC.ALIGN_LEFT
      - SC.ALIGN_RIGHT
      - SC.ALIGN_CENTER

    @type String
    @default SC.ALIGN_CENTER
  */
  align: SC.ALIGN_CENTER,

  /**
    Change the layout direction to make this a vertical set of tabs instead
    of horizontal ones. Possible values:

      - SC.LAYOUT_HORIZONTAL
      - SC.LAYOUT_VERTICAL

    @type String
    @default SC.LAYOUT_HORIZONTAL
  */
  layoutDirection: SC.LAYOUT_HORIZONTAL,


  // ..........................................................
  // SEGMENT DEFINITION
  //

  /**
    The array of items to display.  This may be a simple array of strings, objects
    or SC.Objects.  If you pass objects or SC.Objects, you must also set the
    various itemKey properties to tell the SegmentedView how to extract the
    information it needs.

    Note: only SC.Object items support key-value coding and therefore may be
    observed by the view for changes to titles, values, icons, widths,
    isEnabled values & tooltips.

    @type Array
    @default null
  */
  items: null,

  /**
    The key that contains the title for each item.

    @type String
    @default null
  */
  itemTitleKey: null,

  /**
    The key that contains the value for each item.

    @type String
    @default null
  */
  itemValueKey: null,

  /**
    A key that determines if this item in particular is enabled.  Note if the
    control in general is not enabled, no items will be enabled, even if the
    item's enabled property returns YES.

    @type String
    @default null
  */
  itemIsEnabledKey: null,

  /**
    The key that contains the icon for each item.  If omitted, no icons will
    be displayed.

    @type String
    @default null
  */
  itemIconKey: null,

  /**
    The key that contains the desired width for each item.  If omitted, the
    width will autosize.

    @type String
    @default null
  */
  itemWidthKey: null,

  /**
    The key that contains the action for this item.  If defined, then
    selecting this item will fire the action in addition to changing the
    value.  See also itemTargetKey.

    @type String
    @default null
  */
  itemActionKey: null,

  /**
    The key that contains the target for this item.  If this and itemActionKey
    are defined, then this will be the target of the action fired.

    @type String
    @default null
  */
  itemTargetKey: null,

  /**
    The key that contains the layerId for each item.
    @type String
  */
  itemLayerIdKey: null,

  /**
    The key that contains the key equivalent for each item.  If defined then
    pressing that key equivalent will be like selecting the tab.  Also,
    pressing the Alt or Option key for 3 seconds will display the key
    equivalent in the tab.

    @type String
    @default null
  */
  itemKeyEquivalentKey: null,

  /**
    If YES, overflowing items are placed into a menu and an overflow segment is
    added to popup that menu.

    @type Boolean
    @default YES
  */
  shouldHandleOverflow: YES,

  /**
    The title to use for the overflow segment if it appears.

    NOTE: This will not be HTML escaped and must never be assigned to user inserted text!

    @type String
    @default '&raquo;'
  */
  overflowTitle: '&raquo;',

  /**
    The toolTip to use for the overflow segment if it appears.

    @type String
    @default 'More&hellip;'
  */
  overflowToolTip: 'More…',

  /**
    The icon to use for the overflow segment if it appears.

    @type String
    @default null
  */
  overflowIcon: null,

  /**
    The view class used when creating segments.

    @type SC.View
    @default SC.SegmentView
  */
  segmentViewClass: SC.SegmentView,


  /** @private
    The following properties are used to map items to child views. Item keys
    are looked up on the item based on this view's value for each 'itemKey'.
    If a value in the item is found, then that value is mapped to a child
    view using the matching viewKey.

    @type Array
  */
  itemKeys: ['itemTitleKey', 'itemValueKey', 'itemIsEnabledKey', 'itemIconKey', 'itemWidthKey', 'itemToolTipKey', 'itemKeyEquivalentKey', 'itemLayerIdKey'],

  /** @private */
  viewKeys: ['title', 'value', 'isEnabled', 'icon', 'width', 'toolTip', 'keyEquivalent', 'layerId'],

  /** @private
    Call itemsDidChange once to initialize segment child views for the items that exist at
    creation time.
  */
  init: function () {
    arguments.callee.base.apply(this,arguments);

    var title = this.get('overflowTitle'),
        toolTip = this.get('overflowToolTip'),
        icon = this.get('overflowIcon'),
        overflowView;

    overflowView = this.get('segmentViewClass').create({
      controlSize: this.get('controlSize'),
      escapeHTML: false,
      localize: this.get('localize'),
      title: title,
      toolTip: toolTip,
      icon: icon,
      isLastSegment: YES,
      isOverflowSegment: YES,
      layoutDirection: this.get('layoutDirection'),
      isVisible: this.get('shouldHandleOverflow')
    });
    this.set('overflowView', overflowView);

    this.appendChild(overflowView);

    this.itemsDidChange();
  },

  shouldHandleOverflowDidChange: function () {
    if (this.get('shouldHandleOverflow')) {
      // remeasure should show/hide it as needed
      this.invokeLast(this.remeasure);
    } else {
      this.get('overflowView').set('isVisible', NO);
    }
  }.observes('shouldHandleOverflow'),

  /** @private
    Called whenever the number of items changes.  This method populates SegmentedView's childViews, taking
    care to re-use existing childViews if possible.
  */
  itemsDidChange: function () {
    var items = this.get('items') || [],
      localItem,                        // Used to avoid altering the original items
      previousItem,
      childViews = this.get('childViews'),
      childView,
      overflowView = childViews.lastObject(),
      value = this.get('value'),        // The value can change if items that were once selected are removed
      isSelected,
      itemKeys = this.get('itemKeys'),
      itemKey,
      segmentViewClass = this.get('segmentViewClass'),
      i, j;

    // Update childViews
    if (childViews.get('length') - 1 > items.get('length')) {   // We've lost segments (ie. childViews)

      // Remove unneeded segments from the end back
      for (i = childViews.get('length') - 2; i >= items.get('length'); i--) {
        childView = childViews.objectAt(i);
        localItem = childView.get('localItem');

        // Remove observers from items we are losing off the end
        if (localItem instanceof SC.Object) {

          for (j = itemKeys.get('length') - 1; j >= 0; j--) {
            itemKey = this.get(itemKeys.objectAt(j));

            if (itemKey) {
              localItem.removeObserver(itemKey, this, this.itemContentDidChange);
            }
          }
        }

        // If a selected childView has been removed then update our value
        if (SC.isArray(value)) {
          value.removeObject(localItem);
        } else if (value === localItem) {
          value = null;
        }

        this.removeChildAndDestroy(childView);
      }

      // Update our value which may have changed
      this.set('value', value);

    } else if (childViews.get('length') - 1 < items.get('length')) {  // We've gained segments

      // Create the new segments
      for (i = childViews.get('length') - 1; i < items.get('length'); i++) {

        // We create a default SC.ButtonView-like object for each segment
        childView = segmentViewClass.create({
          controlSize: this.get('controlSize'),
          localize: this.get('localize'),
          layoutDirection: this.get('layoutDirection')
        });

        // Attach the child
        this.insertBefore(childView, overflowView);
      }
    }

    // Because the items array can be altered with insertAt or removeAt, we can't be sure that the items
    // continue to match 1-to-1 the existing views, so once we have the correct number of childViews,
    // simply update them all
    childViews = this.get('childViews');

    for (i = 0; i < items.get('length'); i++) {
      localItem = items.objectAt(i);
      childView = childViews.objectAt(i);
      previousItem = childView.get('localItem');

      if (previousItem instanceof SC.Object && !items.contains(previousItem)) {
        // If the old item is no longer in the view, remove its observers
        for (j = itemKeys.get('length') - 1; j >= 0; j--) {
          itemKey = this.get(itemKeys.objectAt(j));

          if (itemKey) {
            previousItem.removeObserver(itemKey, this, this.itemContentDidChange);
          }
        }
      }

      // Skip null/undefined items (but don't skip empty strings)
      if (SC.none(localItem)) continue;

      // Normalize the item (may be a String, Object or SC.Object)
      if (SC.typeOf(localItem) === SC.T_STRING) {

        localItem = SC.Object.create({
          'title': localItem.humanize().titleize(),
          'value': localItem
        });

        // Update our keys accordingly
        this.set('itemTitleKey', 'title');
        this.set('itemValueKey', 'value');
      } else if (SC.typeOf(localItem) === SC.T_HASH) {

        localItem = SC.Object.create(localItem);
      } else if (localItem instanceof SC.Object)  {

        // We don't need to make any changes to SC.Object items, but we can observe them
        for (j = itemKeys.get('length') - 1; j >= 0; j--) {
          itemKey = this.get(itemKeys.objectAt(j));

          if (itemKey) {
            localItem.removeObserver(itemKey, this, this.itemContentDidChange);
            localItem.addObserver(itemKey, this, this.itemContentDidChange, i);
          }
        }
      } else {
        SC.Logger.error('SC.SegmentedView items may be Strings, Objects (ie. Hashes) or SC.Objects only');
      }

      // Determine whether this segment is selected based on the view's existing value(s)
      isSelected = NO;
      if (SC.isArray(value) ? value.indexOf(localItem.get(this.get('itemValueKey'))) >= 0 : value === localItem.get(this.get('itemValueKey'))) {
        isSelected = YES;
      }
      childView.set('isSelected', isSelected);

      // Assign segment specific properties based on position
      childView.set('index', i);
      childView.set('isFirstSegment', i === 0);
      childView.set('isMiddleSegment',  i < items.get('length') - 1 && i > 0);
      childView.set('isLastSegment', i === items.get('length') - 1);

      // Be sure to update the view's properties for the (possibly new) matched item
      childView.updateItem(this, localItem);
    }

    // Force a segment remeasure to check overflow
    if (this.get('shouldHandleOverflow')) {
      this.invokeLast(this.remeasure);
    }
  }.observes('*items.[]'),

  /** @private
    This observer method is called whenever any of the relevant properties of an item change.  This only applies
    to SC.Object based items that may be observed.
  */
  itemContentDidChange: function (item, key, alwaysNull, index) {
    var childViews = this.get('childViews'),
        childView;

    childView = childViews.objectAt(index);
    if (childView) {

      // Update the childView
      childView.updateItem(this, item);

      // Reset our measurements (which depend on width/height or title) and adjust visible views
      if (this.get('shouldHandleOverflow')) {
        this.invokeLast(this.remeasure);
      }
    }
  },

  /** @private
    Whenever the view resizes, we need to check to see if we're overflowing.
  */
  viewDidResize: function () {
    var isHorizontal = this.get('layoutDirection') === SC.LAYOUT_HORIZONTAL,
      visibleDim = isHorizontal ? this.$().width() : this.$().height();

    // Only overflow if we've gone below the minimum dimension required to fit all the segments
    if (this.get('shouldHandleOverflow') && (this.isOverflowing || visibleDim <= this.cachedMinimumDim)) {
      this.invokeLast(this.remeasure);
    }
  },

  /** @private
    Whenever visibility changes, we need to check to see if we're overflowing.
  */
  isVisibleInWindowDidChange: function () {
    if (this.get('shouldHandleOverflow')) {
      this.invokeLast(this.remeasure);
    }
  }.observes('isVisibleInWindow'),

  /** @private
    Calling this method forces the segments to be remeasured and will also adjust the
    segments for overflow if necessary.
  */
  remeasure: function () {
    if (!this.get('shouldHandleOverflow')) { return; }

    var childViews = this.get('childViews'),
        overflowView;

    if (this.get('isVisibleInWindow')) {
      // Make all the views visible so that they can be measured
      overflowView = childViews.lastObject();
      overflowView.set('isVisible', YES);

      for (var i = childViews.get('length') - 1; i >= 0; i--) {
        childViews.objectAt(i).set('isVisible', YES);
      }

      this.cachedDims = this.segmentDimensions();
      this.cachedOverflowDim = this.overflowSegmentDim();

      this.adjustOverflow();
    }
  },

  /** @private
    This method is called to adjust the segment views to see if we need to handle for overflow.
   */
  adjustOverflow: function () {
    if (!this.get('shouldHandleOverflow')) { return; }

    var childViews = this.get('childViews'),
        childView,
        value = this.get('value'),
        overflowView = childViews.lastObject(),
        isHorizontal = this.get('layoutDirection') === SC.LAYOUT_HORIZONTAL,
        visibleDim = isHorizontal ? this.$().width() : this.$().height(),  // The inner width/height of the div
        curElementsDim = 0,
        dimToFit,
        length, i;

    // This variable is useful to optimize when we are overflowing
    this.isOverflowing = NO;
    overflowView.set('isSelected', NO);

    // Clear out the overflow items (these are the items not currently visible)
    this.overflowItems = [];

    length = this.cachedDims.length;
    for (i = 0; i < length; i++) {
      childView = childViews.objectAt(i);
      curElementsDim += this.cachedDims[i];

      // check for an overflow (leave room for the overflow segment except for with the last segment)
      dimToFit = (i === length - 1) ? curElementsDim : curElementsDim + this.cachedOverflowDim;

      if (dimToFit > visibleDim) {
        // Add the localItem to the overflowItems
        this.overflowItems.pushObject(childView.get('localItem'));

        // Record that we're now overflowing
        this.isOverflowing = YES;

        childView.set('isVisible', NO);

        // If the first item is already overflowed, make the overflowView first segment
        if (i === 0) overflowView.set('isFirstSegment', YES);

        // If the overflowed segment was selected, show the overflowView as selected instead
        if (SC.isArray(value) ? value.indexOf(childView.get('value')) >= 0 : value === childView.get('value')) {
          overflowView.set('isSelected', YES);
        }
      } else {
        childView.set('isVisible', YES);

        // If the first item is not overflowed, don't make the overflowView first segment
        if (i === 0) overflowView.set('isFirstSegment', NO);
      }
    }

    // Show/hide the overflow view if we have overflowed
    if (this.isOverflowing) overflowView.set('isVisible', YES);
    else overflowView.set('isVisible', NO);

    // Store the minimum dimension (height/width) before overflow
    this.cachedMinimumDim = curElementsDim + this.cachedOverflowDim;
  },

  /**
    Return the dimensions (either heights or widths depending on the layout direction) of the DOM
    elements of the segments.  This will be measured by the view to determine which segments should
    be overflowed.

    It ignores the last segment (the overflow segment).
  */
  segmentDimensions: function () {
    var cv = this.get('childViews'),
        v, f,
        dims = [],
        isHorizontal = this.get('layoutDirection') === SC.LAYOUT_HORIZONTAL;

    for (var i = 0, length = cv.length; i < length - 1; i++) {
      v = cv[i];
      f = v.get('frame');
      dims[i] = isHorizontal ? f.width : f.height;
    }

    return dims;
  },

  /**
    Return the dimension (height or width depending on the layout direction) over the overflow segment.
  */
  overflowSegmentDim: function () {
    var cv = this.get('childViews'),
        v, f,
        isHorizontal = this.get('layoutDirection') === SC.LAYOUT_HORIZONTAL;

    v = cv.length && cv[cv.length - 1];
    if (v) {
      f = v.get('frame');
      return isHorizontal ? f.width : f.height;
    }

    return 0;
  },

  /**
    Return the index of the segment view that is the target of the mouse click.
  */
  indexForClientPosition: function (x, y) {
    var cv = this.get('childViews'),
        length, i,
        v, rect,
        point;

    point = {x: x, y: y};
    for (i = 0, length = cv.length; i < length; i++) {
      v = cv[i];

      rect = v.get('layer').getBoundingClientRect();
      rect = {
        x: rect.left,
        y: rect.top,
        width: (rect.right - rect.left),
        height: (rect.bottom - rect.top)
      };

      // Return the index early if found
      if (SC.pointInRect(point, rect)) return i;
    }

    // Default not found
    return -1;
  },

  // ..........................................................
  // RENDERING/DISPLAY SUPPORT
  //

  /**
    @type Array
    @default ['align']
    @see SC.View#displayProperties
  */
  displayProperties: ['align'],

  /**
    @type String
    @default 'segmentedRenderDelegate'
  */
  renderDelegateName: 'segmentedRenderDelegate',

  // ..........................................................
  // EVENT HANDLING
  //

  /** @private
    Determines the index into the displayItems array where the passed mouse
    event occurred.
  */
  displayItemIndexForEvent: function (evt) {
    var renderDelegate = this.get('renderDelegate');
    var x = evt.clientX;
    var y = evt.clientY;

    // Accessibility workaround: <rdar://problem/10467360> WebKit sends all event coords as 0,0 for all AXPress-triggered events
    if (x === 0 && y === 0) {
      var el = evt.target;
      if (el) {
        var offset = SC.offset(el);
        x = offset.x + Math.round(el.offsetWidth / 2);
        y = offset.y + Math.round(el.offsetHeight / 2);
      }
    }

    if (renderDelegate && renderDelegate.indexForClientPosition) {
      return renderDelegate.indexForClientPosition(this, x, y);
    }

    return this.indexForClientPosition(evt.clientX, evt.clientY);
  },

  /** @private */
  keyDown: function (evt) {
    var childViews,
        childView,
        i, length,
        value, isArray;

    // handle tab key
    if (evt.which === 9 || evt.keyCode === 9) {
      var view = evt.shiftKey ? this.get('previousValidKeyView') : this.get('nextValidKeyView');
      if (view) view.becomeFirstResponder();
      else evt.allowDefault();
      return YES; // handled
    }

    // handle arrow keys
    if (!this.get('allowsMultipleSelection')) {
      childViews = this.get('childViews');

      length = childViews.get('length');
      value = this.get('value');
      isArray = SC.isArray(value);

      // Select from the left to the right
      if (evt.which === 39 || evt.which === 40) {

        if (value) {
          for (i = 0; i < length - 2; i++) {
            childView = childViews.objectAt(i);
            if (isArray ? (value.indexOf(childView.get('value')) >= 0) : (childView.get('value') === value)) {
              this.triggerItemAtIndex(i + 1);
            }
          }
        } else {
          this.triggerItemAtIndex(0);
        }
        return YES; // handled

      // Select from the right to the left
      } else if (evt.which === 37 || evt.which === 38) {

        if (value) {
          for (i = 1; i < length - 1; i++) {
            childView = childViews.objectAt(i);
            if (isArray ? (value.indexOf(childView.get('value')) >= 0) : (childView.get('value') === value)) {
              this.triggerItemAtIndex(i - 1);
            }
          }
        } else {
          this.triggerItemAtIndex(length - 2);
        }

        return YES; // handled
      }
    }

    return NO;
  },

  /** @private */
  mouseDown: function (evt) {
    var childViews = this.get('childViews'),
        childView,
        overflowIndex = childViews.get('length') - 1,
        index;

    if (!this.get('isEnabledInPane')) return YES; // nothing to do

    index = this.displayItemIndexForEvent(evt);
    if (index >= 0) {
      childView = childViews.objectAt(index);
      if (childView.get('isEnabled')) childView.set('isActive', YES);
      this.activeChildView = childView;

      // if mouse was pressed on the overflow segment, popup the menu
      if (index === overflowIndex) this.showOverflowMenu();
      else this._isMouseDown = YES;
    }

    return YES;
  },

  /** @private */
  mouseUp: function (evt) {
    var activeChildView,
        index;

    index = this.displayItemIndexForEvent(evt);
    if (this._isMouseDown && (index >= 0)) {

      this.triggerItemAtIndex(index);

      // Clean up
      activeChildView = this.activeChildView;
      if (activeChildView) {
        activeChildView.set('isActive', NO);
        this.activeChildView = null;
      }
    }

    this._isMouseDown = NO;
    return YES;
  },

  /** @private */
  mouseMoved: function (evt) {
    var childViews = this.get('childViews'),
        overflowIndex = childViews.get('length') - 1,
        activeChildView,
        childView,
        index;

    if (this._isMouseDown) {
      // Update the last segment
      index = this.displayItemIndexForEvent(evt);

      activeChildView = this.activeChildView;
      childView = childViews.objectAt(index);

      if (childView && childView !== activeChildView) {
        // Changed
        if (activeChildView) activeChildView.set('isActive', NO);
        if (childView.get('isEnabled')) childView.set('isActive', YES);
        this.activeChildView = childView;

        if (index === overflowIndex) {
          this.showOverflowMenu();
          this._isMouseDown = NO;
        }
      }
    }
    return YES;
  },

  /** @private */
  mouseEntered: function (evt) {
    var childViews = this.get('childViews'),
        childView,
        overflowIndex = childViews.get('length') - 1,
        index;

    // if mouse was pressed down initially, start detection again
    if (this._isMouseDown) {
      index = this.displayItemIndexForEvent(evt);

      // if mouse was pressed on the overflow segment, popup the menu
      if (index === overflowIndex) {
        this.showOverflowMenu();
        this._isMouseDown = NO;
      } else if (index >= 0) {
        childView = childViews.objectAt(index);
        if (childView.get('isEnabled')) childView.set('isActive', YES);

        this.activeChildView = childView;
      }
    }
    return YES;
  },

  /** @private */
  mouseExited: function (evt) {
    var activeChildView;

    // if mouse was down, hide active index
    if (this._isMouseDown) {
      activeChildView = this.activeChildView;
      if (activeChildView) activeChildView.set('isActive', NO);

      this.activeChildView = null;
    }

    return YES;
  },

  /** @private */
  touchStart: function (touch) {
    var childViews = this.get('childViews'),
        childView,
        overflowIndex = childViews.get('length') - 1,
        index;

    if (!this.get('isEnabledInPane')) return YES; // nothing to do

    index = this.displayItemIndexForEvent(touch);

    if (index >= 0) {
      childView = childViews.objectAt(index);
      childView.set('isActive', YES);
      this.activeChildView = childView;

      // if touch was on the overflow segment, popup the menu
      if (index === overflowIndex) this.showOverflowMenu();
      else this._isTouching = YES;
    }

    return YES;
  },

  /** @private */
  touchEnd: function (touch) {
    var activeChildView,
        index;

    index = this.displayItemIndexForEvent(touch);

    if (this._isTouching && (index >= 0)) {
      this.triggerItemAtIndex(index);

      // Clean up
      activeChildView = this.activeChildView;
      activeChildView.set('isActive', NO);
      this.activeChildView = null;

      this._isTouching = NO;
    }

    return YES;
  },

  /** @private */
  touchesDragged: function (evt, touches) {
    var isTouching = this.touchIsInBoundary(evt),
        childViews = this.get('childViews'),
        overflowIndex = childViews.get('length') - 1,
        activeChildView,
        childView,
        index;

    if (isTouching) {
      if (!this._isTouching) {
        this._touchDidEnter(evt);
      }
      index = this.displayItemIndexForEvent(evt);

      activeChildView = this.activeChildView;
      childView = childViews[index];

      if (childView && childView !== activeChildView) {
        // Changed
        if (activeChildView) activeChildView.set('isActive', NO);
        childView.set('isActive', YES);

        this.activeChildView = childView;

        if (index === overflowIndex) {
          this.showOverflowMenu();
          this._isMouseDown = NO;
        }
      }
    } else {
      if (this._isTouching) this._touchDidExit(evt);
    }

    this._isTouching = isTouching;

    return YES;
  },

  /** @private */
  _touchDidExit: function (evt) {
    var activeChildView;

    if (this.isTouching) {
      activeChildView = this.activeChildView;
      activeChildView.set('isActive', NO);
      this.activeChildView = null;
    }

    return YES;
  },

  /** @private */
  _touchDidEnter: function (evt) {
    var childViews = this.get('childViews'),
        childView,
        overflowIndex = childViews.get('length') - 1,
        index;

    index = this.displayItemIndexForEvent(evt);

    if (index === overflowIndex) {
      this.showOverflowMenu();
      this._isTouching = NO;
    } else if (index >= 0) {
      childView = childViews.objectAt(index);
      childView.set('isActive', YES);
      this.activeChildView = childView;
    }

    return YES;
  },

  /** @private
    Simulates the user clicking on the segment at the specified index. This
    will update the value if possible and fire the action.
  */
  triggerItemAtIndex: function (index) {
    var childViews = this.get('childViews'),
        childView,
        childValue, value, allowEmpty, allowMult;

    childView = childViews.objectAt(index);

    if (!childView.get('isEnabled')) return this; // nothing to do!

    allowEmpty = this.get('allowsEmptySelection');
    allowMult = this.get('allowsMultipleSelection');

    // get new value... bail if not enabled. Also save original for later.
    childValue = childView.get('value');
    value = this.get('value');

    // if we do not allow multiple selection, either replace the current
    // selection or deselect it
    if (!allowMult) {
      // if we allow empty selection and the current value is the same as
      // the selected value, then deselect it.
      if (allowEmpty && value === childValue) {
        value = null;
      } else {
        // otherwise, simply replace the value.
        value = childValue;
      }
    } else {
      // Lazily create the value array.
      if (!value) {
        value = [];
      } else if (!SC.isArray(value)) {
        value = [value];
      }

      // if we do allow multiple selection, then add or remove item to the array.
      if (value.indexOf(childValue) >= 0) {
        if (value.get('length') > 1 || (value.objectAt(0) !== childValue) || allowEmpty) {
          value = value.without(childValue);
        }
      } else {
        value = value.concat(childValue);
      }
    }

    // also, trigger target if needed.
    var actionKey = this.get('itemActionKey'),
        targetKey = this.get('itemTargetKey'),
        action, target = null,
        resp = this.getPath('pane.rootResponder'),
        item;

    if (actionKey && (item = this.get('items').objectAt(index))) {
      // get the source item from the item array.  use the index stored...
      action = item.get ? item.get(actionKey) : item[actionKey];
      if (targetKey) {
        target = item.get ? item.get(targetKey) : item[targetKey];
      }
      if (resp) resp.sendAction(action, target, this, this.get('pane'), value);
    }

    if (value !== undefined && (!action || this.get('selectSegmentWhenTriggeringAction'))) {
      this.set('value', value);
    }

    // if an action/target is defined on self use that also
    action = this.get('action');
    if (action && resp) {
      resp.sendAction(action, this.get('target'), this, this.get('pane'), value);
    }
  },

  /** @private
    Invoked whenever an item is selected in the overflow menu.
  */
  selectOverflowItem: function (menu) {
    var item = menu.get('selectedItem');

    this.triggerItemAtIndex(item.get('index'));

    // Cleanup
    menu.removeObserver('selectedItem', this, 'selectOverflowItem');

    this.activeChildView.set('isActive', NO);
    this.activeChildView = null;
  },

  /** @private
    Presents the popup menu containing overflowed segments.
  */
  showOverflowMenu: function () {
    var childViews = this.get('childViews'),
        overflowItems = this.overflowItems,
        overflowItemsLength,
        startIndex,
        isArray, value;

    // Check the currently selected item if it is in overflowItems
    overflowItemsLength = overflowItems.get('length');
    startIndex = childViews.get('length') - 1 - overflowItemsLength;

    value = this.get('value');
    isArray = SC.isArray(value);
    for (var i = 0; i < overflowItemsLength; i++) {
      var item = overflowItems.objectAt(i),
          itemValueKey = this.get('itemValueKey');

      if (isArray ? value.indexOf(item.get(itemValueKey)) >= 0 : value === item.get(itemValueKey)) {
        item.set('isChecked', YES);
      } else {
        item.set('isChecked', NO);
      }

      // Track the matching segment index
      item.set('index', startIndex + i);
    }

    // TODO: we can't pass a shortcut key to the menu, because it isn't a property of SegmentedView (yet?)
    var self = this;

    var menu = SC.MenuPane.create({
      layout: { width: 200 },
      items: overflowItems,
      itemTitleKey: this.get('itemTitleKey'),
      itemIconKey: this.get('itemIconKey'),
      itemIsEnabledKey: this.get('itemIsEnabledKey'),
      itemKeyEquivalentKey: this.get('itemKeyEquivalentKey'),
      itemCheckboxKey: 'isChecked',

      // We need to be able to update our overflow segment even if the user clicks outside of the menu.  Since
      // there is no callback method or observable property when the menu closes, override modalPaneDidClick().
      modalPaneDidClick: function () {
        arguments.callee.base.apply(this,arguments);

        // Cleanup
        this.removeObserver('selectedItem', self, 'selectOverflowItem');

        self.activeChildView.set('isActive', NO);
        self.activeChildView = null;
      }
    });

    var layer = this.get('layer');
    var overflowElement = layer.childNodes[layer.childNodes.length - 1];
    menu.popup(overflowElement);

    menu.addObserver("selectedItem", this, 'selectOverflowItem');
  },

  /** @private
    Whenever the value changes, update the segments accordingly.
  */
  valueDidChange: function () {
    var value = this.get('value'),
        overflowItemsLength,
        childViews = this.get('childViews'),
        overflowIndex = Infinity,
        overflowView = childViews.lastObject(),
        childView;

    // The index where childViews are all overflowed
    if (this.overflowItems) {
      overflowItemsLength = this.overflowItems.get('length');
      overflowIndex = childViews.get('length') - 1 - overflowItemsLength;

      // Clear out the selected value of the overflowView (if it's set)
      overflowView.set('isSelected', NO);
    }

    for (var i = childViews.get('length') - 2; i >= 0; i--) {
      childView = childViews.objectAt(i);
      if (SC.isArray(value) ? value.indexOf(childView.get('value')) >= 0 : value === childView.get('value')) {
        childView.set('isSelected', YES);

        // If we've gone over the overflow index, the child view is represented in overflow items
        if (i >= overflowIndex) overflowView.set('isSelected', YES);
      } else {
        childView.set('isSelected', NO);
      }
    }
  }.observes('value')

});

/* >>>>>>>>>> BEGIN source/views/select.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('views/button');

/**
  @class

  SelectView has a functionality similar to that of SelectField

  Clicking the SelectView button displays a menu pane with a
  list of items. The selected item will be displayed on the button.
  User has the option of enabling checkbox for the selected menu item.

  @extends SC.ButtonView
  @version 1.0
  @author Alex Iskander, Mohammed Ashik
*/
SC.SelectView = SC.ButtonView.extend(
/** @scope SC.SelectView.prototype */ {

  /**
    @field
    @type Boolean
    @default YES
  */
  acceptsFirstResponder: function () {
    return this.get('isEnabledInPane');
  }.property('isEnabledInPane'),

  /**
    If true, titles will be escaped to avoid scripting attacks.

    @type Boolean
    @default YES
  */
  escapeHTML: YES,
  escapeHTMLBindingDefault: SC.Binding.oneWay().bool(),

  /**
    An array of items that will be form the menu you want to show.

    @type Array
    @default []
  */
  items: [],

  /** @private */
  itemsBindingDefault: SC.Binding.multiple(),

  /**
    If you set this to a non-null value, then the name shown for each
    menu item will be pulled from the object using the named property.
    if this is null, the collection items themselves will be used.

    @type String
    @default null
  */
  itemTitleKey: null,

  /**
    If you set this to a non-null value, then the value of this key will
    be used to sort the items.  If this is not set, then itemTitleKey will
    be used.

    @type String
    @default null
  */
  itemSortKey: null,

  /**
     Set this to a non-null value to use a key from the passed set of items
     as the value for the options popup.  If you don't set this, then the
     items themselves will be used as the value.

     @type String
     @default null
  */
  itemValueKey: null,

  /**
     Key used to extract icons from the items array

     @type String
     @default null
  */
  itemIconKey: null,

  /**
    Key to use to identify separators.

    @type String
    @default "isSeparator"
  */
  itemSeparatorKey: "isSeparator",

  /**
    Key used to indicate if the item is to be enabled.

    @type String
    @default "isEnabled"
  */
  itemIsEnabledKey: "isEnabled",

  /**
    @type Boolean
    @default YES
  */
  localize: YES,

  /**
    if true, it means that no sorting will occur, items will appear
    in the same order as in the array

    @type Boolean
    @default YES
  */
  disableSort: YES,

  /**
    @type Array
    @default ['sc-select-button']
    @see SC.View#classNames
  */
  classNames: ['sc-select-view'],

  /**
    Menu attached to the SelectView.

    @type SC.View
    @default SC.MenuView
  */
  menu: null,

  /**
    List of actual menu items, handed off to the menu view.

    @property
    @private
    @type:{Array}
  */
  _itemList: [],

  /**
    Property to set the index of the selected menu item. This in turn
    is used to calculate the preferMatrix.

    @property
    @type Number
    @default null
    @private
  */
  _itemIdx: null,

  /**
     Current Value of the SelectView

     @type Object
     @default null
  */
  value: null,

  /**
    if this property is set to 'YES', a checkbox is shown next to the
    selected menu item.

    @type Boolean
    @default YES
  */
  checkboxEnabled: YES,

  /**
    if this property is set to 'YES', a checkbox is shown next to the
    selected menu item.

    @type Boolean
    @default YES
  */
  showCheckbox: YES,

  /**
    Set this to non-null to place an empty option at the top of the menu.

    @property
    @type String
    @default null
  */
  emptyName: null,

  /**
    Default value of the select button.
     This will be the first item from the menu item list.

    @private
  */
  _defaultVal: null,

  /**
    Default title of the select button.
     This will be the title corresponding to the _defaultVal.

    @private
  */
  _defaultTitle: null,

  /**
    Default icon of the select button.
     This will be the icon corresponding to the _defaultVal.

    @private
  */
  _defaultIcon: null,

  /**
    The button theme will be popup

    @type String
    @default 'popup'
    @readOnly
  */
  theme: 'popup',

  /**
    @type SC.Array
    @default ['icon', 'value','controlSize']
    @see SC.View#displayProperties
  */
  displayProperties: ['icon', 'value','controlSize', 'escapeHTML', 'emptyName'],

  /**
    Prefer matrix to position the select button menu such that the
    selected item for the menu item will appear aligned to the
    the button. The value at the second index(0) changes based on the
    position(index) of the menu item in the menu pane.

    @type Array
    @default null
  */
  preferMatrix: null,

  /**
    Property to set the menu item height. This in turn is used for
    the calculation of prefMatrix.

    @type Number
    @default 20
  */
  CUSTOM_MENU_ITEM_HEIGHT: 20,

  /**
    Binds the button's selection state to the menu's visibility.

    @private
  */
  isActiveBinding: '*menu.isVisibleInWindow',

  /**
    If this property is set to 'YES', the menu pane will be positioned
    below the anchor.

    @type Boolean
    @default NO
  */
  isDefaultPosition: NO,

  /**
    lastMenuWidth is the width of the last menu which was created from
    the items of this select button.

    @private
  */
  lastMenuWidth: null,

  /**
    Example view used for menu items.

    @type SC.View
    @default null
  */
  exampleView: null,

  /**
    customView menu offset width

    @type Number
    @default 0
  */
  customViewMenuOffsetWidth: 0,

  /**
    This is a property for enabling/disabling ellipsis

    @type Boolean
    @default YES
  */
  needsEllipsis: YES,

  /**
    This property allows you at add extra padding to the height
    of the menu pane.

    @type Number
    @default 0
  */
  menuPaneHeightPadding: 0,

  /**
    The amount of space to add to the calculated width of the menu item strings to
    determine the width of the menu pane.

    @type Number
    @default 35
  */
  menuItemPadding: 35,

  /**
    @type Boolean
    @default NO
  */
  isContextMenuEnabled: NO,

  /**
    This is a property to enable/disable focus rings in buttons.
    For select_button, we are making it a default.

    @type Boolean
    @default YES
    @see SC.ButtonView#supportFocusRing
  */
  supportFocusRing: YES,

  /**
  * @private
  * Overwritten to calculate the content corresponding to items configured at creation
  */
  init: function() {
    arguments.callee.base.apply(this,arguments);

    this.itemsDidChange();
  },

  /**
    Left Alignment based on the size of the button

    @private
  */
  leftAlign: function () {
    switch (this.get('controlSize')) {
      case SC.TINY_CONTROL_SIZE:
        return SC.SelectView.TINY_OFFSET_X;
      case SC.SMALL_CONTROL_SIZE:
        return SC.SelectView.SMALL_OFFSET_X;
      case SC.REGULAR_CONTROL_SIZE:
        return SC.SelectView.REGULAR_OFFSET_X;
      case SC.LARGE_CONTROL_SIZE:
        return SC.SelectView.LARGE_OFFSET_X;
      case SC.HUGE_CONTROL_SIZE:
        return SC.SelectView.HUGE_OFFSET_X;
    }
    return 0;
  }.property('controlSize'),

  /**
    override this method to implement your own sorting of the menu. By
    default, menu items are sorted using the value shown or the sortKey

    @param {SC.Array} objects the unsorted array of objects to display.
    @returns {SC.Array} sorted array of objects
  */
  sortObjects: function (objects) {
    if (!this.get('disableSort')){
      var nameKey = this.get('itemSortKey') || this.get('itemTitleKey');
      objects = objects.sort(function (a,b) {
        if (nameKey) {
          a = a.get ? a.get(nameKey) : a[nameKey];
          b = b.get ? b.get(nameKey) : b[nameKey];
        }
        return (a<b) ? -1 : ((a>b) ? 1 : 0);
      });
    }
    return objects;
  },

  /**
    Observer called whenever the items collection or an element of this collection changes

    @private
  */
  itemsDidChange: function() {
    var escapeHTML, items, len, nameKey, iconKey, valueKey, separatorKey, showCheckbox,
        currentSelectedVal, shouldLocalize, isSeparator, itemList, isChecked,
        idx, name, icon, value, item, itemEnabled, isEnabledKey, emptyName, isSameRecord;

    items = this.get('items') || [];
    items = this.sortObjects(items);
    len = items.length;

    //Get the nameKey, iconKey and valueKey set by the user
    nameKey = this.get('itemTitleKey');
    iconKey = this.get('itemIconKey');
    valueKey = this.get('itemValueKey');
    separatorKey = this.get('itemSeparatorKey');
    showCheckbox = this.get('showCheckbox');
    isEnabledKey = this.get('itemIsEnabledKey');
    escapeHTML = this.get('escapeHTML');

    //get the current selected value
    currentSelectedVal = this.get('value');

    // get the localization flag.
    shouldLocalize = this.get('localize');

    //itemList array to set the menu items
    itemList = [];

    //to set the 'checkbox' property of menu items
    isChecked = YES;

    //index for finding the first item in the list
    idx = 0;

    // Add the empty name to the list if applicable
    emptyName = this.get('emptyName');

    if (!SC.none(emptyName)) {
      emptyName = shouldLocalize ? SC.String.loc(emptyName) : emptyName;
      emptyName = escapeHTML ? SC.RenderContext.escapeHTML(emptyName) : emptyName;

      item = SC.Object.create({
        isSeparator: NO,
        title: emptyName,
        icon: null,
        value: null,
        isEnabled: YES,
        checkbox: NO,
        target: this,
        action: 'displaySelectedItem'
      });

      if (SC.none(currentSelectedVal)) {
        this.set('title', emptyName);
      }

      //Set the items in the itemList array
      itemList.push(item);
    }

    items.forEach(function (object) {
      if (object || object === 0) {
        
        // TODO: Remove in 1.11 and 2.0
        // Help the developer if they were relying on the previously misleading
        // default value of itemSeparatorKey.  We need to ensure that the change
        // is backwards compatible with apps prior to 1.10.
        if (separatorKey === 'isSeparator') {
          if ((object.get && SC.none(object.get('isSeparator')) && object.get('separator')) || (SC.none(object.isSeparator) && object.separator)) {
            SC.warn("Developer Warning: the default value of itemSeparatorKey has been changed from 'separator' to 'isSeparator' to match the documentation.  Please update your select item properties to 'isSeparator: YES' to remove this warning.");
            if (object.set) { object.set('isSeparator', object.get('separator')); }
            else { object.isSeparator = object.separator; }
          }
        }
        

        // get the separator
        isSeparator = separatorKey ? (object.get ? object.get(separatorKey) : object[separatorKey]) : NO;

          if (!isSeparator) {
          //Get the name value. If value key is not specified convert obj
          //to string
          name = nameKey ? (object.get ?
            object.get(nameKey) : object[nameKey]) : object.toString();

          
          // Help the developer if they don't define a matching itemTitleKey.
          if (!name) {
            SC.warn("Developer Warning: SC.SelectView: Every item, other than separator items, should have the '%@' property defined!".fmt(nameKey));
            name = '';
          }
          
          // localize name if specified.
          name = shouldLocalize ? SC.String.loc(name) : name;
          name = escapeHTML ? SC.RenderContext.escapeHTML(name) : name;

          //Get the icon value
          icon = iconKey ? (object.get ?
            object.get(iconKey) : object[iconKey]) : null;
          if (SC.none(object[iconKey])) icon = null;

          // get the value using the valueKey or the object
          value = valueKey ? (object.get ?
            object.get(valueKey) : object[valueKey]) : object;

          if (!SC.none(currentSelectedVal) && !SC.none(value)) {

            // If the objects in question are records, we should just their storeKeys
            isSameRecord = false;
            if (SC.kindOf(currentSelectedVal, SC.Record) && SC.kindOf(value, SC.Record)) {
              isSameRecord = currentSelectedVal.get('storeKey') === value.get('storeKey');
            }

            if (currentSelectedVal === value || isSameRecord) {
              this.set('title', name);
              this.set('icon', icon);
            }
          }

          //Check if the item is currentSelectedItem or not
          if (value === this.get('value')) {

            //set the _itemIdx - To change the prefMatrix accordingly.
            this.set('_itemIdx', idx);
            isChecked = !showCheckbox ? NO : YES;
          }
          else {
            isChecked = NO;
          }

          // Check if the item is enabled
          itemEnabled = (object.get ? object.get(isEnabledKey) : object[isEnabledKey]);
          if (NO !== itemEnabled) itemEnabled = YES;

          // Set the first non-separator selectable item from the list as the
          // default selected item
          if (SC.none(this._defaultVal) && itemEnabled) {
            this._defaultVal = value;
            this._defaultTitle = name;
            this._defaultIcon = icon;
          }
        }

        item = SC.Object.create({
          isSeparator: isSeparator,
          title: name,
          icon: icon,
          value: value,
          isEnabled: itemEnabled,
          checkbox: isChecked,
          target: this,
          action: 'displaySelectedItem'
        });

        //Set the items in the itemList array
        itemList.push(item);

      }

      idx += 1;

      this.set('_itemList', itemList);
    }, this );

    var value = this.get('value');
    if (SC.none(value)) {
      if (SC.none(emptyName)) {
        this.set('value', this._defaultVal);
        this.set('title', this._defaultTitle);
        this.set('icon', this._defaultIcon);
      }
      else this.set('title', emptyName);
    }

    //Set the preference matrix for the menu pane
    this.changeSelectPreferMatrix();
  }.observes( '*items.[]' ),

  /**
    @private
    @param {DOMMouseEvent} evt mouseup event that triggered the action
  */
  _action: function (evt) {
    var buttonLabel, menuWidth, scrollWidth, lastMenuWidth, offsetWidth,
      items, elementOffsetWidth, largestMenuWidth, item, idx,
      value, itemList, menuControlSize, menuHeightPadding, customView,
      menu, itemsLength, itemIdx, escapeHTML;

    buttonLabel = this.$('.sc-button-label')[0];

    var menuWidthOffset = SC.SelectView.MENU_WIDTH_OFFSET;
    if (!this.get('isDefaultPosition')) {
      switch (this.get('controlSize')) {
        case SC.TINY_CONTROL_SIZE:
          menuWidthOffset += SC.SelectView.TINY_POPUP_MENU_WIDTH_OFFSET;
          break;
        case SC.SMALL_CONTROL_SIZE:
          menuWidthOffset += SC.SelectView.SMALL_POPUP_MENU_WIDTH_OFFSET;
          break;
        case SC.REGULAR_CONTROL_SIZE:
          menuWidthOffset += SC.SelectView.REGULAR_POPUP_MENU_WIDTH_OFFSET;
          break;
        case SC.LARGE_CONTROL_SIZE:
          menuWidthOffset += SC.SelectView.LARGE_POPUP_MENU_WIDTH_OFFSET;
          break;
        case SC.HUGE_CONTROL_SIZE:
          menuWidthOffset += SC.SelectView.HUGE_POPUP_MENU_WIDTH_OFFSET;
          break;
      }
    }
    // Get the length of the text on the button in pixels
    menuWidth = this.get('layer').offsetWidth + menuWidthOffset;

    // Get the length of the text on the button in pixels
    menuWidth = this.get('layer').offsetWidth;
    scrollWidth = buttonLabel.scrollWidth;
    lastMenuWidth = this.get('lastMenuWidth');
    if (scrollWidth) {
       // Get the original width of the label in the button
       offsetWidth = buttonLabel.offsetWidth;
       if (scrollWidth && offsetWidth) {
          menuWidth = menuWidth + scrollWidth - offsetWidth;
       }
    }
    if (!lastMenuWidth || (menuWidth > lastMenuWidth)) {
      lastMenuWidth = menuWidth;
    }

    items = this.get('_itemList');

    var customViewClassName = this.get('customViewClassName');
    // var customViewMenuOffsetWidth = this.get('customViewMenuOffsetWidth');
    var className = 'sc-view sc-pane sc-panel sc-palette sc-picker sc-menu select-button sc-scroll-view sc-menu-scroll-view sc-container-view menuContainer sc-button-view sc-menu-item sc-regular-size';
    className = customViewClassName ? (className + ' ' + customViewClassName) : className;

    SC.prepareStringMeasurement("", className);
    for (idx = 0, itemsLength = items.length; idx < itemsLength; ++idx) {
      //getting the width of largest menu item
      item = items.objectAt(idx);
      elementOffsetWidth = SC.measureString(item.title).width;

      if (!largestMenuWidth || (elementOffsetWidth > largestMenuWidth)) {
        largestMenuWidth = elementOffsetWidth;
      }
    }
    SC.teardownStringMeasurement();

    lastMenuWidth = (largestMenuWidth + this.menuItemPadding > lastMenuWidth) ?
                      largestMenuWidth + this.menuItemPadding : lastMenuWidth;

    // Get the window size width and compare with the lastMenuWidth.
    // If it is greater than windows width then reduce the maxwidth by 25px
    // so that the ellipsis property is enabled by default
    var maxWidth = SC.RootResponder.responder.get('currentWindowSize').width;
    if (lastMenuWidth > maxWidth) {
      lastMenuWidth = (maxWidth - 25);
    }

    this.set('lastMenuWidth',lastMenuWidth);
    value = this.get('value');
    itemList = this.get('_itemList');
    menuControlSize = this.get('controlSize');
    menuHeightPadding = this.get('menuPaneHeightPadding');
    escapeHTML = this.get('escapeHTML');

    // get the user defined custom view
    customView = this.get('exampleView') || SC.MenuItemView.extend({ escapeHTML: escapeHTML });

    menu  = SC.MenuPane.create({

      /**
        Class name - select-button-item
      */
      classNames: ['select-button'],

      /**
        The menu items are set from the itemList property of SelectView

        @property
      */
      items: itemList,

      /**
        Example view which will be used to create the Menu Items

        @default SC.MenuItemView
        @type SC.View
      */
      exampleView: customView,

      /**
        This property enables all the items and makes them selectable.

        @property
      */
      isEnabled: YES,

      menuHeightPadding: menuHeightPadding,

      preferType: SC.PICKER_MENU,
      itemHeightKey: 'height',
      layout: { width: lastMenuWidth },
      controlSize: menuControlSize,
      itemWidth: lastMenuWidth
    });

    // no menu to toggle... bail...
    if (!menu) return NO;
    menu.popup(this, this.preferMatrix);
    this.set('menu', menu);

    itemIdx = this._itemIdx;
    if (!SC.empty(itemIdx) && itemIdx > -1) {
    // if there is an item selected, make it the first responder
      customView = menu.menuItemViewForContentIndex(itemIdx);
      if (customView) { customView.becomeFirstResponder(); }
    }

    this.set('isActive', YES);
    return YES;
  },

  /** @private
     Action method for the select button menu items
  */
  displaySelectedItem: function (menuView) {
    var currentItem = menuView.get("selectedItem");

    this.set("value", currentItem.get("value"));
    this.set("title", currentItem.get("title"));
    this.set("_itemIdx", currentItem.get("contentIndex"));
  },

  /** @private
     Set the "top" attribute in the prefer matrix property which will
     position menu such that the selected item in the menu will be
     place aligned to the item on the button when menu is opened.
  */
  changeSelectPreferMatrix: function () {
    var controlSizeTuning = 0, customMenuItemHeight = 0;
    switch (this.get('controlSize')) {
      case SC.TINY_CONTROL_SIZE:
        controlSizeTuning = SC.SelectView.TINY_OFFSET_Y;
        customMenuItemHeight = SC.MenuPane.TINY_MENU_ITEM_HEIGHT;
        break;
      case SC.SMALL_CONTROL_SIZE:
        controlSizeTuning = SC.SelectView.SMALL_OFFSET_Y;
        customMenuItemHeight = SC.MenuPane.SMALL_MENU_ITEM_HEIGHT;
        break;
      case SC.REGULAR_CONTROL_SIZE:
        controlSizeTuning = SC.SelectView.REGULAR_OFFSET_Y;
        customMenuItemHeight = SC.MenuPane.REGULAR_MENU_ITEM_HEIGHT;
        break;
      case SC.LARGE_CONTROL_SIZE:
        controlSizeTuning = SC.SelectView.LARGE_OFFSET_Y;
        customMenuItemHeight = SC.MenuPane.LARGE_MENU_ITEM_HEIGHT;
        break;
      case SC.HUGE_CONTROL_SIZE:
        controlSizeTuning = SC.SelectView.HUGE_OFFSET_Y;
        customMenuItemHeight = SC.MenuPane.HUGE_MENU_ITEM_HEIGHT;
        break;
    }

    var preferMatrixAttributeTop = controlSizeTuning,
      itemIdx = this.get('_itemIdx'),
      leftAlign = this.get('leftAlign'), defPreferMatrix, tempPreferMatrix;

    if (this.get('isDefaultPosition')) {
      defPreferMatrix = [1, 0, 3];
      this.set('preferMatrix', defPreferMatrix);
    } else {
      if (itemIdx) {
        preferMatrixAttributeTop = itemIdx * customMenuItemHeight +
          controlSizeTuning;
      }
      tempPreferMatrix = [leftAlign, -preferMatrixAttributeTop, 2];
      this.set('preferMatrix', tempPreferMatrix);
    }
  },

  /**
    @private
    Holding down the button should display the menu pane.
  */
  mouseDown: function (evt) {
    if (!this.get('isEnabledInPane')) return YES; // handled event, but do nothing
    this.set('isActive', YES);
    this._isMouseDown = YES;
    this.becomeFirstResponder();
    this._action();
    return YES;
  },

  /** @private
    Because we responded YES to the mouseDown event, we have responsibility
    for handling the corresponding mouseUp event.

    However, the user may click on this button, then drag the mouse down to a
    menu item, and release the mouse over the menu item. We therefore need to
    delegate any mouseUp events to the menu's menu item, if one is selected.

    We also need to differentiate between a single click and a click and hold.
    If the user clicks and holds, we want to close the menu when they release.
    Otherwise, we should wait until they click on the menu's modal pane before
    removing our active state.

    @param {SC.Event} evt
    @returns {Boolean}
  */
  mouseUp: function (evt) {
    var menu = this.get('menu'), targetMenuItem;

    if (menu) {
      targetMenuItem = menu.getPath('rootMenu.targetMenuItem');

      if (targetMenuItem && menu.get('mouseHasEntered')) {
        // Have the menu item perform its action.
        // If the menu returns NO, it had no action to
        // perform, so we should close the menu immediately.
        if (!targetMenuItem.performAction()) menu.remove();
      } else {
        // If the user waits more than 200ms between mouseDown and mouseUp,
        // we can assume that they are clicking and dragging to the menu item,
        // and we should close the menu if they mouseup anywhere not inside
        // the menu.
        if (evt.timeStamp - this._mouseDownTimestamp > 400) {
          menu.remove();
        }
      }
    }

    // Reset state.
    this._isMouseDown = NO;
    this.set("isActive", NO);
    return YES;
  },

  /** @private
    Override mouseExited to not remove the active state on mouseexit.
  */
  mouseExited: function () {
    return YES;
  },

  /**
    @private
    Handle Key event - Down arrow key
  */
  keyDown: function (event) {
    if ( this.interpretKeyEvents(event) ) {
      return YES;
    }
    else {
      return arguments.callee.base.apply(this,arguments);
    }
  },

  /**
    @private
    Pressing the Up or Down arrow key should display the menu pane
  */
  interpretKeyEvents: function (event) {
    if (event) {
      if ((event.keyCode === 38 || event.keyCode === 40)) {
        this._action();
      }
      else if (event.keyCode === 27) {
        this.resignFirstResponder();
      }
    }
    return arguments.callee.base.apply(this,arguments);
  },

  /** @private
    Override the button isSelectedDidChange function in order to not perform any action
    on selecting the select_button
  */
  _button_isSelectedDidChange: function () {

  }.observes('isSelected')

});

/**
  @static
  @type Number
  @default 0
*/
SC.SelectView.TINY_OFFSET_X = 0;

/**
  @static
  @type Number
  @default 0
*/
SC.SelectView.TINY_OFFSET_Y = 0;

/**
  @static
  @type Number
  @default 0
*/
SC.SelectView.TINY_POPUP_MENU_WIDTH_OFFSET = 0;


/**
  @static
  @type Number
  @default -18
*/
SC.SelectView.SMALL_OFFSET_X = -18;

/**
  @static
  @type Number
  @default 3
*/
SC.SelectView.SMALL_OFFSET_Y = 3;

/**
  @static
  @type Number
  @default 7
*/
SC.SelectView.SMALL_POPUP_MENU_WIDTH_OFFSET = 7;


/**
  @static
  @type Number
  @default -17
*/
SC.SelectView.REGULAR_OFFSET_X = -17;

/**
  @static
  @type Number
  @default 1
*/
SC.SelectView.REGULAR_OFFSET_Y = 0;

/**
  @static
  @type Number
  @default 4
*/
SC.SelectView.REGULAR_POPUP_MENU_WIDTH_OFFSET = 4;


/**
  @static
  @type Number
  @default -17
*/
SC.SelectView.LARGE_OFFSET_X = -17;

/**
  @static
  @type Number
  @default 6
*/
SC.SelectView.LARGE_OFFSET_Y = 6;

/**
  @static
  @type Number
  @default 3
*/
SC.SelectView.LARGE_POPUP_MENU_WIDTH_OFFSET = 3;


/**
  @static
  @type Number
  @default 0
*/
SC.SelectView.HUGE_OFFSET_X = 0;

/**
  @static
  @type Number
  @default 0
*/
SC.SelectView.HUGE_OFFSET_Y = 0;

/**
  @static
  @type Number
  @default 0
*/
SC.SelectView.HUGE_POPUP_MENU_WIDTH_OFFSET = 0;


/**
  @static
  @type Number
  @default -2
*/
SC.SelectView.MENU_WIDTH_OFFSET = -2;

/* >>>>>>>>>> BEGIN source/views/select_button.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('views/button');

/**
  @class

  SelectButtonView has a functionality similar to that of `SelectField`

  Clicking the SelectButtonView button displays a menu pane with a
  list of items. The selected item will be displayed on the button.
  User has the option of enabling checkbox for the selected menu item.

  @deprecated Please use SC.SelectView instead

  @extends SC.ButtonView
  @version 1.0
  @author Mohammed Ashik
*/
SC.SelectButtonView = SC.ButtonView.extend(
/** @scope SC.SelectButtonView.prototype */ {

  init: function(){
    
    SC.Logger.warn("SC.SelectButtonView is deprecated. Please use SC.SelectView instead.");
    
    arguments.callee.base.apply(this,arguments);
  },

  /**
    @type Boolean
    @default YES
  */
  escapeHTML: YES,

  /**
    An array of items that will be form the menu you want to show.

    @type Array
    @default []
  */
  objects: [],

  /** @private */
  objectsBindingDefault: SC.Binding.multiple(),

  /**
    If you set this to a non-null value, then the name shown for each
    menu item will be pulled from the object using the named property.
    if this is `null`, the collection objects themselves will be used.

    @type String
    @default: null
  */
  nameKey: null,

  /**
    If you set this to a non-null value, then the value of this key will
    be used to sort the objects.  If this is not set, then `nameKey` will
    be used.

    @property String}
    @default: null
  */
  sortKey: null,

  /**
     Set this to a non-null value to use a key from the passed set of objects
     as the value for the options popup.  If you don't set this, then the
     objects themselves will be used as the value.

     @type String
     @default null
  */
  valueKey: null,

  /**
     Key used to extract icons from the objects array

     @type String
     @default null
  */
  iconKey: null,

  /**
    Key used to indicate if the item is to be enabled

    @type String
    @default "isEnabled"
  */
  isEnabledKey: "isEnabled",

  /**
    If true, the empty name will be localized.

    @type Boolean
    @default YES
  */
  localize: YES,

  /**
    if true, it means that no sorting will occur, objects will appear
    in the same order as in the array

    @type Boolean
    @default YES
  */
  disableSort: YES,

  /**
    @property
    @default ['select-button']
    @see SC.View#classNames
  */
  classNames: ['select-button'],

  /**
    Menu attached to the `selectButton`

    @type SC.View
    @default SC.MenuView
  */
  menu : null,

  /**
    Menu item list

    @type Array
    @default []
  */
  itemList: [],

  /**
    Property to set the index of the selected menu item. This in turn
    is used to calculate the `preferMatrix`.

    @type Number
    @default null
  */
  itemIdx: null,

  /**
     Current Value of the selectButton

     @type Object
     @default null
  */
  value: null,

  /**
    if this property is set to `YES`, a checkbox is shown next to the
    selected menu item.

    @type Boolean
    @default YES
  */
  checkboxEnabled: YES,

  /**
    Set this property to required display position of separator from bottom

    @default null
  */
  separatorPosition: null,

  /** @private
    Default value of the select button.
    This will be the first item from the menu item list.
  */
  _defaultVal: null,

  /** @private
    Default title of the select button.
    This will be the title corresponding to the _defaultVal.
  */
  _defaultTitle: null,

  /** @private
    Default icon of the select button.
    This will be the icon corresponding to the _defaultVal.
  */
  _defaultIcon: null,

  /**
    @property {String|SC.Theme}
    @default 'popup'
  */
  theme: 'popup',

  /**
    Render method gets triggered when these properties change

    @type Array
    @default ['icon', 'value','controlSize','objects', 'objects.[]']
  */
  displayProperties: ['icon', 'value','controlSize','objects', 'objects.[]'],

  /**
    Prefer matrix to position the select button menu such that the
    selected item for the menu item will appear aligned to the
    the button. The value at the second `index(0)` changes based on the
    `position(index)` of the menu item in the menu pane.

    @type Array
    @default null
  */
  preferMatrix: null,

  /**
    Width of the sprite image that gets applied due to the theme.
    This has to be accounted for while calculating the actual
    width of the button

    @type Number
    @default 28
  */
  SELECT_BUTTON_SPRITE_WIDTH: 28,

  /** @private
    Binds the button's selection state to the menu's visibility.
  */
  isActiveBinding: '*menu.isVisibleInWindow',

  /** @private
    If this property is set to `YES`, the menu pane will be positioned
    below the anchor.
  */
  isDefaultPosition: NO,

  /** @private
    lastMenuWidth is the width of the last menu which was created from
    the objects of this select button.
  */
  lastMenuWidth: null,

  /**
    customView used to draw the menu

    @type SC.View
    @default null
  */
  customView: null,

  /**
    CSS classes applied to customView

    @type String
    @default null
  */
  customViewClassName: null,

  /**
    customView menu offset width

    @type Number
    @default 0
  */
  customViewMenuOffsetWidth: 0,

  /**
    @type Boolean
    @default YES
  */
  needsEllipsis: YES,

  /**
    This property allows you at add extra padding to the height
    of the menu pane.

    @type Number
    @default 0
  */
  menuPaneHeightPadding: 0,

  /**
    This is a property to enable/disable focus rings in buttons.
    For `select_button` we are making it a default.

    @type Boolean
    @default YES
  */
  supportFocusRing: YES,

  /**
    @type Boolean
    @default NO
  */
  isContextMenuEnabled: NO,


  /**@private
    Left Alignment based on the size of the button
  */
  leftAlign: function() {
    switch (this.get('controlSize')) {
      case SC.TINY_CONTROL_SIZE:
        return SC.SelectButtonView.TINY_OFFSET_X;
      case SC.SMALL_CONTROL_SIZE:
        return SC.SelectButtonView.SMALL_OFFSET_X;
      case SC.REGULAR_CONTROL_SIZE:
        return SC.SelectButtonView.REGULAR_OFFSET_X;
      case SC.LARGE_CONTROL_SIZE:
        return SC.SelectButtonView.LARGE_OFFSET_X;
      case SC.HUGE_CONTROL_SIZE:
        return SC.SelectButtonView.HUGE_OFFSET_X;
    }
    return 0;
  }.property('controlSize'),

  /**
    override this method to implement your own sorting of the menu. By
    default, menu items are sorted using the value shown or the `sortKey`

    @param {SC.Array} objects the unsorted array of objects to display.
    @returns sorted array of objects
  */
  sortObjects: function(objects) {
    if(!this.get('disableSort')){
      var nameKey = this.get('sortKey') || this.get('nameKey') ;
      objects = objects.sort(function(a,b) {
        if (nameKey) {
          a = a.get ? a.get(nameKey) : a[nameKey] ;
          b = b.get ? b.get(nameKey) : b[nameKey] ;
        }
        return (a<b) ? -1 : ((a>b) ? 1 : 0) ;
      }) ;
    }
    return objects;
  },

  /** @private */
  render: function(context, firstTime) {
    arguments.callee.base.apply(this,arguments);
    var layoutWidth, objects, len, nameKey, iconKey, valueKey, checkboxEnabled,
      currentSelectedVal, shouldLocalize, separatorPosition, itemList, isChecked,
      idx, name, icon, value, item, itemEnabled, isEnabledKey ;
    layoutWidth = this.layout.width ;
    if(firstTime && layoutWidth) {
      this.adjust({ width: layoutWidth - this.SELECT_BUTTON_SPRITE_WIDTH }) ;
    }

    objects = this.get('objects') ;
    objects = this.sortObjects(objects) ;
    len = objects.length ;

    //Get the namekey, iconKey and valueKey set by the user
    nameKey = this.get('nameKey') ;
    iconKey = this.get('iconKey') ;
    valueKey = this.get('valueKey') ;
    isEnabledKey = this.get('isEnabledKey') ;
    checkboxEnabled = this.get('checkboxEnabled') ;

    //get the current selected value
    currentSelectedVal = this.get('value') ;

    // get the localization flag.
    shouldLocalize = this.get('localize') ;

    //get the separatorPosition
    separatorPosition = this.get('separatorPosition') ;

    //itemList array to set the menu items
    itemList = [] ;

    //to set the 'checkbox' property of menu items
    isChecked = YES ;

    //index for finding the first item in the list
    idx = 0 ;

    objects.forEach(function(object) {
    if (object) {

      //Get the name value. If value key is not specified convert obj
      //to string
      name = nameKey ? (object.get ?
        object.get(nameKey) : object[nameKey]) : object.toString() ;

      // localize name if specified.
      name = shouldLocalize? SC.String.loc(name) : name ;

      //Get the icon value
      icon = iconKey ? (object.get ?
        object.get(iconKey) : object[iconKey]) : null ;
      if (SC.none(object[iconKey])) icon = null ;

      // get the value using the valueKey or the object
        value = (valueKey) ? (object.get ?
        object.get(valueKey) : object[valueKey]) : object ;

      if (!SC.none(currentSelectedVal) && !SC.none(value)){
        if(this._equals(currentSelectedVal, value) ) {
          this.set('title', name) ;
          this.set('icon', icon) ;
        }
      }

      //Check if the item is currentSelectedItem or not
      if(this._equals(value, this.get('value'))) {

        // increase index by 1 if item falls below the separator in menu list
        if(separatorPosition > 0 && separatorPosition<len &&
          idx >= len-separatorPosition) {
          idx++ ;
        }

        //set the itemIdx - To change the prefMatrix accordingly.
        this.set('itemIdx', idx) ;
        isChecked = !checkboxEnabled ? NO : YES ;
      }
      else {
        isChecked = NO ;
      }

      //Check if item is enabled
      itemEnabled = (isEnabledKey) ? (object.get ?
      object.get(isEnabledKey) : object[isEnabledKey]) : object ;

      if(NO !== itemEnabled) itemEnabled = YES ;

      //Set the first item from the list as default selected item
      if (idx === 0) {
        this._defaultVal = value ;
        this._defaultTitle = name ;
        this._defaultIcon = icon ;
      }

      var item = SC.Object.create({
        title: name,
        icon: icon,
        value: value,
        isEnabled: itemEnabled,
        checkbox: isChecked,
        target: this,
        action: 'displaySelectedItem'
      }) ;

      //Set the items in the itemList array
      itemList.push(item);
    }

    idx += 1 ;

    // display the separator if specified by the user
    if (separatorPosition && idx === (len-separatorPosition)) {
      var separator = SC.Object.create({
        separator: YES
      }) ;
      itemList.push(separator);
    }

    this.set('itemList', itemList) ;
    }, this ) ;

    if(firstTime) {
      context.setAttr('aria-haspopup', 'true') ;
      this.invokeLast(function() {
        var value = this.get('value') ;
        if(SC.none(value)) {
          this.set('value', this._defaultVal) ;
          this.set('title', this._defaultTitle) ;
          this.set('icon', this._defaultIcon) ;
        }
      });
    }

    //Set the preference matrix for the menu pane
    this.changeSelectButtonPreferMatrix(this.itemIdx) ;

  },

  /** @private
    Compares the the two values.

    This function can be overridden if the value of the Select Button field
    is an object.
  */
  _equals: function(value1, value2) {
    var ret = YES;
    if (value1 && SC.typeOf(value1) === SC.T_HASH &&
        value2 && SC.typeOf(value2) === SC.T_HASH) {
      for(var key in value1) {
        if(value1[key] !== value2[key]) ret = NO;
      }
    }
    else ret = (value1 === value2);
    return ret;
  },

  /** @private
    Button action handler

    @param {DOMMouseEvent} evt mouseup event that triggered the action
  */
  _action: function(evt) {
    var buttonLabel, menuWidth, scrollWidth, lastMenuWidth, offsetWidth,
      items, elementOffsetWidth, largestMenuWidth, item, element, idx,
      value, itemList, menuControlSize, menuHeightPadding, customView,
      customMenuView, menu, itemsLength, dummyMenuItemView,
      menuItemViewEscapeHTML, menuWidthOffset, body;

    buttonLabel = this.$('.sc-button-label')[0] ;

    menuWidthOffset = SC.SelectButtonView.MENU_WIDTH_OFFSET ;
    if(!this.get('isDefaultPosition')) {
      switch (this.get('controlSize')) {
        case SC.TINY_CONTROL_SIZE:
          menuWidthOffset += SC.SelectButtonView.TINY_POPUP_MENU_WIDTH_OFFSET;
          break;
        case SC.SMALL_CONTROL_SIZE:
          menuWidthOffset += SC.SelectButtonView.SMALL_POPUP_MENU_WIDTH_OFFSET;
          break;
        case SC.REGULAR_CONTROL_SIZE:
          menuWidthOffset += SC.SelectButtonView.REGULAR_POPUP_MENU_WIDTH_OFFSET;
          break;
        case SC.LARGE_CONTROL_SIZE:
          menuWidthOffset += SC.SelectButtonView.LARGE_POPUP_MENU_WIDTH_OFFSET;
          break;
        case SC.HUGE_CONTROL_SIZE:
          menuWidthOffset += SC.SelectButtonView.HUGE_POPUP_MENU_WIDTH_OFFSET;
          break;
      }
    }
    // Get the length of the text on the button in pixels
    menuWidth = this.get('layer').offsetWidth + menuWidthOffset ;
    scrollWidth = buttonLabel.scrollWidth ;
    lastMenuWidth = this.get('lastMenuWidth') ;
    if(scrollWidth) {
       // Get the original width of the label in the button
       offsetWidth = buttonLabel.offsetWidth ;
       if(scrollWidth && offsetWidth) {
          menuWidth = menuWidth + scrollWidth - offsetWidth ;
       }
    }
    if (!lastMenuWidth || (menuWidth > lastMenuWidth)) {
      lastMenuWidth = menuWidth ;
    }

    items = this.get('itemList') ;

    var customViewClassName = this.get('customViewClassName'),
        customViewMenuOffsetWidth = this.get('customViewMenuOffsetWidth'),
        className = 'sc-view sc-pane sc-panel sc-palette sc-picker sc-menu select-button menu sc-scroll-view sc-menu-scroll-view sc-container-view sc-menu-item menu-item value sc-regular-size' ;
    className = customViewClassName ? (className + ' ' + customViewClassName) : className ;

    dummyMenuItemView = (this.get('customView') || SC.MenuItemView).create();
    menuItemViewEscapeHTML = dummyMenuItemView.get('escapeHTML') ;
    body = document.body;
    for (idx = 0, itemsLength = items.length; idx < itemsLength; ++idx) {
      //getting the width of largest menu item
      item = items.objectAt(idx) ;
      element = document.createElement('div') ;
      element.style.cssText = 'top:-10000px; left: -10000px;  position: absolute;' ;
      element.className = className ;
      element.innerHTML = menuItemViewEscapeHTML ? SC.RenderContext.escapeHTML(item.title) : item.title ;
      body.appendChild(element) ;
      elementOffsetWidth = element.offsetWidth + customViewMenuOffsetWidth;

      if (!largestMenuWidth || (elementOffsetWidth > largestMenuWidth)) {
        largestMenuWidth = elementOffsetWidth ;
      }
      body.removeChild(element) ;
    }
    largestMenuWidth = (largestMenuWidth > lastMenuWidth) ?
                      largestMenuWidth: lastMenuWidth ;

    // Get the window size width and compare with the lastMenuWidth.
    // If it is greater than windows width then reduce the maxwidth by 25px
    // so that the ellipsis property is enabled by default
    var maxWidth = SC.RootResponder.responder.get('currentWindowSize').width;
    if(largestMenuWidth > maxWidth) {
      largestMenuWidth = (maxWidth - 25) ;
    }

    this.set('lastMenuWidth',lastMenuWidth) ;
    value = this.get('value') ;
    itemList = this.get('itemList') ;
    menuControlSize = this.get('controlSize') ;

    // get the user defined custom view
    customView = this.get('customView') ;
    customMenuView = customView ? customView : SC.MenuItemView ;

    menu  = SC.MenuPane.create({

      classNames: ['select-button'],

      items: itemList,

      exampleView: customMenuView,

      isEnabled: YES,
      preferType: SC.PICKER_MENU,
      itemHeightKey: 'height',
      layout: { width: largestMenuWidth },
      controlSize: menuControlSize,
      itemWidth: lastMenuWidth,

      /**
        PerformKeyEquivalent, for handling tab and shift + tab
        Prevents the focus going to next fields when menu is open and you tab

        @param {String} keystring
        @param {SC.Event} evt
        @returns {Boolean}  YES if handled
      */

      performKeyEquivalent: function( keystring, evt ) {
        switch (keystring) {
          case 'tab':
          case 'shift_tab':
            return YES ;
          default:
            return arguments.callee.base.apply(this,arguments) ;
        }
      }
    }) ;

    // no menu to toggle... bail...
    if (!menu) return NO ;
    menu.popup(this, this.preferMatrix) ;
    this.set('menu', menu);

    customView = menu.menuItemViewForContentIndex(this.get('itemIdx'));
    menu.set('currentMenuItem', customView) ;
    if (customView) customView.becomeFirstResponder();

    this.set('isActive', YES);
    return YES ;
  },

  /**
     Action method for the select button menu items
  */
  displaySelectedItem: function(menuView) {
    var currentItem = this.getPath('menu.selectedItem');
    if (!currentItem) return NO;

    this.set('value', currentItem.get('value')) ;
    this.set('title', currentItem.get('title')) ;
    this.set('itemIdx', currentItem.get('contentIndex')) ;

    return YES;
  },

  /**
     Set the "top" attribute in the prefer matrix property which will
     position menu such that the selected item in the menu will be
     place aligned to the item on the button when menu is opened.
  */
  changeSelectButtonPreferMatrix: function() {
    var controlSizeTuning = 0, customMenuItemHeight = 0,
        customSeparatorHeight = 0, separatorHeightTuning = 0,
        pos, len;
    switch (this.get('controlSize')) {
      case SC.TINY_CONTROL_SIZE:
        controlSizeTuning = SC.SelectButtonView.TINY_OFFSET_Y;
        customMenuItemHeight = SC.MenuPane.TINY_MENU_ITEM_HEIGHT;
        customSeparatorHeight = SC.MenuPane.TINY_MENU_ITEM_SEPARATOR_HEIGHT;
        break;
      case SC.SMALL_CONTROL_SIZE:
        controlSizeTuning = SC.SelectButtonView.SMALL_OFFSET_Y;
        customMenuItemHeight = SC.MenuPane.SMALL_MENU_ITEM_HEIGHT;
        customSeparatorHeight = SC.MenuPane.SMALL_MENU_ITEM_SEPARATOR_HEIGHT;
        break;
      case SC.REGULAR_CONTROL_SIZE:
        controlSizeTuning = SC.SelectButtonView.REGULAR_OFFSET_Y;
        customMenuItemHeight = SC.MenuPane.REGULAR_MENU_ITEM_HEIGHT;
        customSeparatorHeight = SC.MenuPane.REGULAR_MENU_ITEM_SEPARATOR_HEIGHT;
        break;
      case SC.LARGE_CONTROL_SIZE:
        controlSizeTuning = SC.SelectButtonView.LARGE_OFFSET_Y;
        customMenuItemHeight = SC.MenuPane.LARGE_MENU_ITEM_HEIGHT;
        customSeparatorHeight = SC.MenuPane.LARGE_MENU_ITEM_SEPARATOR_HEIGHT;
        break;
      case SC.HUGE_CONTROL_SIZE:
        controlSizeTuning = SC.SelectButtonView.HUGE_OFFSET_Y;
        customMenuItemHeight = SC.MenuPane.HUGE_MENU_ITEM_HEIGHT;
        customSeparatorHeight = SC.MenuPane.HUGE_MENU_ITEM_SEPARATOR_HEIGHT;
        break;
    }

    var preferMatrixAttributeTop = controlSizeTuning ,
        itemIdx = this.get('itemIdx') ,
        leftAlign = this.get('leftAlign'), defPreferMatrix, tempPreferMatrix ;

    if(this.get('isDefaultPosition')) {
      defPreferMatrix = [1, 0, 3] ;
      this.set('preferMatrix', defPreferMatrix) ;
    }
    else {
      if(itemIdx) {
        preferMatrixAttributeTop = itemIdx * customMenuItemHeight +
          controlSizeTuning ;

        // if current selected item falls below the separator, adjust the
        // top of menu pane
        pos = this.get('separatorPosition');
        len = this.get('objects').length;
        if(pos > 0 && pos < len && itemIdx >= len-pos) {
          separatorHeightTuning =
          customMenuItemHeight - customSeparatorHeight;
          // reduce the top to adjust the extra height calculated because
          // of considering separator as a menu item
          preferMatrixAttributeTop -= separatorHeightTuning;
        }
      }
      tempPreferMatrix = [leftAlign, -preferMatrixAttributeTop, 2] ;
      this.set('preferMatrix', tempPreferMatrix) ;
    }
  },

  /** @private
    Holding down the button should display the menu pane.
  */
  mouseDown: function(evt) {
    if (!this.get('isEnabled')) return YES ; // handled event, but do nothing
    this.set('isActive', YES);
    this._isMouseDown = YES;
    this.becomeFirstResponder() ;
    this._action() ;

    // Store the current timestamp. We register the timestamp after a setTimeout
    // so that the menu has been rendered, in case that operation
    // takes more than a few hundred milliseconds.

    // One mouseUp, we'll use this value to determine how long the mouse was
    // pressed.

    // we need to keep track that we opened it just now in case we get the
    // mouseUp before render finishes. If it is 0, then we know we have not
    // waited long enough.
    this._menuRenderedTimestamp = 0;

    var self = this;

    // setTimeout guarantees that all rendering is done. The browser will even
    // have rendered by this point.
    setTimeout(function() {
      SC.run(function(){
        // a run loop might be overkill here but what if Date.now fails?
        self._menuRenderedTimestamp = Date.now();
      });
    }, 1);

    return YES ;
  },

  /** @private
    Records the current timestamp. This is invoked at the end of the runloop
    by mouseDown. We use this value to determine the delay between mouseDown
    and mouseUp.
  */
  _recordMouseDownTimestamp: function() {
    this._menuRenderedTimestamp = new Date().getTime();
  },

  /** @private
    Because we responded `YES` to the mouseDown event, we have responsibility
    for handling the corresponding `mouseUp` event.

    However, the user may click on this button, then drag the mouse down to a
    menu item, and release the mouse over the menu item. We therefore need to
    delegate any mouseUp events to the menu's menu item, if one is selected.

    We also need to differentiate between a single click and a click and hold.
    If the user clicks and holds, we want to close the menu when they release.
    Otherwise, we should wait until they click on the menu's modal pane before
    removing our active state.

    @param {SC.Event} evt
    @returns {Boolean}
  */
  mouseUp: function(evt) {
    var timestamp = new Date().getTime(),
        previousTimestamp = this._menuRenderedTimestamp,
        menu = this.get('menu'),
        touch = SC.platform.touch,
        targetMenuItem;

    // normalize the previousTimestamp: if it is 0, it might as well be now.
    // 0 means that we have not even triggered the nearly-immediate saving of timestamp.
    if (previousTimestamp === 0) previousTimestamp = Date.now();


    if (menu) {
      targetMenuItem = menu.getPath('rootMenu.targetMenuItem');

      if (targetMenuItem && targetMenuItem.get('mouseHasEntered')) {
        // Have the menu item perform its action.
        // If the menu returns `NO`, it had no action to
        // perform, so we should close the menu immediately.
        if (!targetMenuItem.performAction()) menu.remove();
      } else if (!touch && (timestamp - previousTimestamp > SC.ButtonView.CLICK_AND_HOLD_DELAY)) {
        // If the user waits more than a certain length of time between
        // mouseDown and mouseUp, we can assume that they are clicking and
        // dragging to the menu item, and we should close the menu if they
        // mouseup anywhere not inside the menu.

        // As a special case, we should trigger an action on the currently
        // selected menu item if the menu item is under the mouse and the user
        // never moved their mouse before mouseup.
        if (!menu.get('mouseHasEntered') && !this.get('isDefaultPosition')) {
          targetMenuItem = menu.get('currentMenuItem');
          if (targetMenuItem && !targetMenuItem.performAction()) {
            menu.remove();
          }
        } else {
          // Otherwise, just remove the menu because no selection
          // has been made.
          menu.remove();
        }
      }
    }


    // Reset state.
    this._isMouseDown = NO;
    this.set('isActive', NO);
    return YES;
  },

  /** @private
    Override mouseExited to not remove the active state on mouseexit.
  */
  mouseExited: function() {
    return YES;
  },

  /** @private
    Handle Key event - Down arrow key
  */
  keyDown: function(event) {
    if ( this.interpretKeyEvents(event) ) {
      return YES;
    }
    else {
      return arguments.callee.base.apply(this,arguments);
    }
  },

  /** @private
    Pressing the Up or Down arrow key should display the menu pane
  */
  interpretKeyEvents: function(event) {
    if (event) {
      if ((event.keyCode === 38 || event.keyCode === 40)) {
        this._action() ;
      }
      else if (event.keyCode === 27) {
        this.resignFirstResponder() ;
      }
    }
    return arguments.callee.base.apply(this,arguments);
  },

  /** @private
    Function overridden - tied to the isEnabled state
  */
  acceptsFirstResponder: function() {
    return this.get('isEnabled');
  }.property('isEnabled'),

  insertTab: function(evt) {
    var view = this.get('nextValidKeyView');
    if (view) view.becomeFirstResponder();
    else evt.allowDefault();
    return YES ; // handled
  },

  insertBacktab: function(evt) {
    var view = this.get('previousValidKeyView');
    if (view) view.becomeFirstResponder();
    else evt.allowDefault();
    return YES ; // handled
  },


  /** @private
    Override the button isSelectedDidChange function in order to not perform any action
    on selecting the select_button
  */
  _button_isSelectedDidChange: function() {

  }.observes('isSelected'),

  /** @private */
  didAppendToDocument: function() {}

}) ;

/**
  @static
  @default 0
*/
SC.SelectButtonView.TINY_OFFSET_X = 0;

/**
  @static
  @default 0
*/
SC.SelectButtonView.TINY_OFFSET_Y = 0;

/**
  @static
  @default 0
*/
SC.SelectButtonView.TINY_POPUP_MENU_WIDTH_OFFSET = 0;


/**
  @static
  @default -18
*/
SC.SelectButtonView.SMALL_OFFSET_X = -18;

/**
  @static
  @default 3
*/
SC.SelectButtonView.SMALL_OFFSET_Y = 3;

/**
  @static
  @default 7
*/
SC.SelectButtonView.SMALL_POPUP_MENU_WIDTH_OFFSET = 7;


/**
  @static
  @default -17
*/
SC.SelectButtonView.REGULAR_OFFSET_X = -17;

/**
  @static
  @default 3
*/
SC.SelectButtonView.REGULAR_OFFSET_Y = 3;

/**
  @static
  @default 4
*/
SC.SelectButtonView.REGULAR_POPUP_MENU_WIDTH_OFFSET = 4;


/**
  @static
  @default -17
*/
SC.SelectButtonView.LARGE_OFFSET_X = -17;

/**
  @static
  @default 6
*/
SC.SelectButtonView.LARGE_OFFSET_Y = 6;

/**
  @static
  @default 3
*/
SC.SelectButtonView.LARGE_POPUP_MENU_WIDTH_OFFSET = 3;


/**
  @static
  @default 0
*/
SC.SelectButtonView.HUGE_OFFSET_X = 0;

/**
  @static
  @default 0
*/
SC.SelectButtonView.HUGE_OFFSET_Y = 0;

/**
  @static
  @default 0
*/
SC.SelectButtonView.HUGE_POPUP_MENU_WIDTH_OFFSET = 0;


/**
  @static
  @default -2
*/
SC.SelectButtonView.MENU_WIDTH_OFFSET = -2;

/**
  Default metrics for the different control sizes.
*/
SC.MenuPane.TINY_MENU_ITEM_HEIGHT = 10;
SC.MenuPane.TINY_MENU_ITEM_SEPARATOR_HEIGHT = 2;
SC.MenuPane.TINY_MENU_HEIGHT_PADDING = 2;
SC.MenuPane.TINY_SUBMENU_OFFSET_X = 0;

SC.MenuPane.SMALL_MENU_ITEM_HEIGHT = 16;
SC.MenuPane.SMALL_MENU_ITEM_SEPARATOR_HEIGHT = 7;
SC.MenuPane.SMALL_MENU_HEIGHT_PADDING = 4;
SC.MenuPane.SMALL_SUBMENU_OFFSET_X = 2;

SC.MenuPane.REGULAR_MENU_ITEM_HEIGHT = 22;
SC.MenuPane.REGULAR_MENU_ITEM_SEPARATOR_HEIGHT = 9;
SC.MenuPane.REGULAR_MENU_HEIGHT_PADDING = 6;
SC.MenuPane.REGULAR_SUBMENU_OFFSET_X = 2;

SC.MenuPane.LARGE_MENU_ITEM_HEIGHT = 31;
SC.MenuPane.LARGE_MENU_ITEM_SEPARATOR_HEIGHT = 20;
SC.MenuPane.LARGE_MENU_HEIGHT_PADDING = 0;
SC.MenuPane.LARGE_SUBMENU_OFFSET_X = 4;

SC.MenuPane.HUGE_MENU_ITEM_HEIGHT = 20;
SC.MenuPane.HUGE_MENU_ITEM_SEPARATOR_HEIGHT = 9;
SC.MenuPane.HUGE_MENU_HEIGHT_PADDING = 0;
SC.MenuPane.HUGE_SUBMENU_OFFSET_X = 0;

/* >>>>>>>>>> BEGIN source/views/select_field.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


/**
  @class

  DEPRECATED. Use SelectView instead.

  SelectFieldView displays browser-native popup menu.  To use this view,
  you should either bake into the HTML the preset list of options, or
  you can set the -objects property to an array of items to show.  The
  value is current value of the select.

  @deprecated
  @extends SC.FieldView
  @author Charles Jolley
  @author Mike Ball
  @since SproutCore 1.0
*/
SC.SelectFieldView = SC.FieldView.extend(
/** @scope SC.SelectFieldView.prototype */ {

  /**
    @type Array
    @default ['objects','nameKey','valueKey']
    @see SC.View#displayProperties
  */
  displayProperties: ['objects','nameKey','valueKey'],

  /**
    Reflects the value of `isEnabledInPane`.

    @field
    @type Boolean
    @default YES
  */
  acceptsFirstResponder: function() {
    return this.get('isEnabledInPane');
  }.property('isEnabledInPane'),

  /**
    @type String
    @default 'select'
    @see SC.View#tagName
  */
  tagName: 'select',

  /**
    @type Array
    @default ['sc-select-field-view']
    @see SC.View#classNames
  */
  classNames: ['sc-select-field-view'],

  /**
    An array of items that will form the menu you want to show.

    @type Array
    @default []
  */
  objects: [],

  /** @private
    Binding default for an array of objects
  */
  objectsBindingDefault: SC.Binding.multiple(),

  /**
    If you set this to a non-null value, then the name shown for each
    menu item will be pulled from the object using the named property.
    if this is null, the collection objects themselves will be used.

    @type String
    @default null
  */
  nameKey: null,

  /**
    If you set this to a non-null value, then the value of this key will
    be used to sort the objects.  If this is not set, then nameKey will
    be used.

    @type String
    @default null
  */
  sortKey: null,

  /**
     Set this to a non-null value to use a key from the passed set of objects
     as the value for the options popup.  If you don't set this, then the
     objects themselves will be used as the value.

     @type String
     @default null
  */
  valueKey: null,

  /**
    set this to non-null to place an empty option at the top of the menu.

    @type String
    @default null
  */
  emptyName: null,

  /**
    if true, the empty name will be localized.

    @type Boolean
    @default NO
  */
  localize: NO,

  /** @private
    if true, it means that the nameKey, valueKey or objects changed
  */
  cpDidChange: YES,

  /**
    if true, it means that no sorting will occur, objects will appear
    in the same order as in the array

    @type Boolean
    @default NO
  */
  disableSort: NO,

  /**
    override this to change the enabled/disabled state of menu items as they
    are built.  Return false if you want the menu item to be disabled.

    @param itemValue the value for the item to validate
    @param itemName the name of the menu item to validate
    @returns YES if the item should be enabled, NO otherwise
  */
  validateMenuItem: function(itemValue, itemName) {
    return YES;
  },

  /**
    override this method to implement your own sorting of the menu. By
    default, menu items are sorted using the value shown or the sortKey

    @param objects the unsorted array of objects to display.
    @returns sorted array of objects
  */
  sortObjects: function(objects) {
    if(!this.get('disableSort')){
      var nameKey = this.get('sortKey') || this.get('nameKey') ;
      if(nameKey) objects = objects.sortProperty(nameKey);
      else{
        objects = objects.sort(function(a,b) {
          if (nameKey) {
            a = a.get ? a.get(nameKey) : a[nameKey] ;
            b = b.get ? b.get(nameKey) : b[nameKey] ;
          }
          return (a<b) ? -1 : ((a>b) ? 1 : 0) ;
        }) ;
      }
    }
    return objects ;
  },

  /** @private */
  render: function(context, firstTime) {
    // Only re-render if it's the firstTime or if a change is required
    if (firstTime || this.get('cpDidChange')) {
      this.set('cpDidChange', NO);
      // get list of objects.
      var nameKey = this.get('nameKey') ;
      var valueKey = this.get('valueKey') ;
      var objects = this.get('objects') ;
      var fieldValue = this.get('value') ;
      var el, selectElement;

      if ( !this.get('isEnabled') ) context.setAttr('disabled','disabled');

      // get the localization flag.
      var shouldLocalize = this.get('localize');

      // convert fieldValue to guid, if it is an object.
      if (!valueKey && fieldValue) fieldValue = SC.guidFor(fieldValue) ;
      if ((fieldValue === null) || (fieldValue === '')) fieldValue = '***' ;

      if (objects) {
        objects = this.sortObjects(objects) ; // sort'em.
        // var html = [] ;
        if(!firstTime){
          selectElement=this.$input()[0];
          if (!selectElement) return;
          selectElement.innerHTML='';
        }

        var emptyName = this.get('emptyName') ;
        if (emptyName) {
          if (shouldLocalize) emptyName = SC.String.loc(emptyName);
          if(firstTime){
            context.push('<option value="***">'+emptyName+'</option>',
                          '<option disabled="disabled"></option>') ;
          }else{
            el=document.createElement('option');
            el.value="***";
            el.innerHTML=emptyName;
            selectElement.appendChild(el);
            el=document.createElement('option');
            el.disabled="disabled";
            selectElement.appendChild(el);
          }
        }

          // generate option elements.
        objects.forEach(function(object, index) {
        if (object) {
          // either get the name from the object or convert object to string.
          var name = nameKey ? (object.get ? object.get(nameKey) : object[nameKey]) : object.toString() ;

          // localize name if specified.
          if(shouldLocalize)
          {
            name = SC.String.loc(name);
          }

          // get the value using the valueKey or the object if no valueKey.
          // then convert to a string or use _guid if one of available.
          var value = (valueKey) ? (object.get ? object.get(valueKey) : object[valueKey]) : object ;
          // if there is no emptyName and no preselected value
          // then the value should be the value of the first element in the list
          if (!emptyName && index === 0 && fieldValue === '***') {
            this.set('value', value);
          }
          if (value !== null && value !== undefined) value = (SC.guidFor(value)) ? SC.guidFor(value) : value.toString() ;

          // render HTML
          var disable = (this.validateMenuItem && this.validateMenuItem(value, name)) ? '' : 'disabled="disabled" ' ;
          if(firstTime){
            context.push('<option '+disable+'value="'+value+'">'+name+'</option>') ;
          } else{
            el=document.createElement('option');
            el.value=value;
            el.innerHTML=name;
            if(disable.length>0) el.disable="disabled";
            selectElement.appendChild(el);
          }
        // null value means separator.
        } else {
          if(firstTime){
            context.push('<option disabled="disabled"></option>') ;
          }else{
            el=document.createElement('option');
            el.disabled="disabled";
            selectElement.appendChild(el);
          }
        }
      }, this );

      this.setFieldValue(fieldValue);

      } else {
        this.set('value',null);
      }
    } else {
      this.$().prop('disabled', !this.get('isEnabled'));
    }
  },

  /** @private */
  _objectsObserver: function() {
    this.set('cpDidChange', YES);
  }.observes('objects'),

  /** @private */
  _objectArrayObserver: function() {
    this.set('cpDidChange', YES);
    this.propertyDidChange('objects');
  }.observes('*objects.[]'),

  /** @private */
  _nameKeyObserver: function() {
    this.set('cpDidChange', YES);
  }.observes('nameKey'),

  /** @private */
  _valueKeyObserver: function() {
    this.set('cpDidChange', YES);
  }.observes('valueKey'),

  /** @private */
  _isEnabledObserver: function() {
    this.set('cpDidChange', YES);
  }.observes('isEnabled'),

  // .......................................
  // PRIVATE
  //

  /** @private */
  $input: function() { return this.$(); },

  /** @private */
  mouseDown: function(evt) {
    if (!this.get('isEnabledInPane')) {
      evt.stop();
      return YES;
    } else return arguments.callee.base.apply(this,arguments);
  },

  /** @private */
  touchStart: function(evt) {
    return this.mouseDown(evt);
  },

  /** @private */
  touchEnd: function(evt) {
    return this.mouseUp(evt);
  },

  // when fetching the raw value, convert back to an object if needed...
  /** @private */
  getFieldValue: function() {
    var value = arguments.callee.base.apply(this,arguments); // get raw value...
    var valueKey = this.get('valueKey') ;
    var objects = this.get('objects') ;
    var found = null; // matching object goes here.
    var object;

    // Handle empty selection.
    if (value == '***') {
      value = null ;

    // If no value key was set and there are objects then match back to an
    // object.
    } else if (value && objects) {
      // objects = Array.from(objects) ;

      var loc = (SC.typeOf(objects.length) === SC.T_FUNCTION) ? objects.length() : objects.length;

      while(!found && (--loc >= 0)) {
        object = objects.objectAt? objects.objectAt(loc) : objects[loc] ;
        if (object === null || object === undefined) continue; // null means placeholder; just skip

        // get value using valueKey if there is one or use object
        // map to _guid or toString.
        if (valueKey) object = (object.get) ? object.get(valueKey) : object[valueKey] ;
        var ov = (object !== null && object !== undefined) ? (SC.guidFor(object) ? SC.guidFor(object) : object.toString()) : null ;

        // use this object value if it matches.
        if (value == ov) found = object ;
      }
    }

    return (valueKey || found) ? found : value;
  },

  /** @private */
  setFieldValue: function(newValue) {
    if (SC.none(newValue)) {
      newValue = '***' ;
    } else {
      newValue = ((newValue !== null && newValue !== undefined) ? (SC.guidFor(newValue) ? SC.guidFor(newValue) : newValue.toString()) : null );
    }
    this.$input().val(newValue);
    return this ;
  },

  /** @private */
  fieldDidFocus: function() {
    var isFocused = this.get('isFocused');
    if (!isFocused) this.set('isFocused', true);
  },

  /** @private */
  fieldDidBlur: function() {
    var isFocused = this.get('isFocused');
    if (isFocused) this.set('isFocused', false);
  },

  /** @private */
  _isFocusedObserver: function() {
    this.$().setClass('focus', this.get('isFocused'));
  }.observes('isFocused'),

  /** @private */
  didCreateLayer: function() {
    var input = this.$input();
    if (this.get('isEnabled') === false) this.$()[0].disabled = true;
    SC.Event.add(input, 'blur', this, this.fieldDidBlur);
    SC.Event.add(input, 'focus',this, this.fieldDidFocus);
    SC.Event.add(input, 'change',this, this._field_fieldValueDidChange);
  },

  /** @private */
  willDestroyLayer: function() {
    var input = this.$input();
    SC.Event.remove(input, 'focus', this, this.fieldDidFocus);
    SC.Event.remove(input, 'blur', this, this.fieldDidBlur);
    SC.Event.remove(input, 'change',this, this._field_fieldValueDidChange);
  }

});

/* >>>>>>>>>> BEGIN source/views/slider.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/** @class

  A SliderView shows a horizontal slider control that you can use to set
  variable values.

  You can use a slider view much like you would any other control.  Simply
  set the value or content/contentValueKey to whatever value you want to
  display.  You can also set the maximumValue and minValue properties to
  determine the mapping of the control to its children.

  @extends SC.View
  @extends SC.Control
  @since SproutCore 1.0
  @test in progress
*/
SC.SliderView = SC.View.extend(SC.Control,
/** @scope SC.SliderView.prototype */ {

  classNames: 'sc-slider-view',

  /**
    The WAI-ARIA role for slider view. This property's value should not be
    changed.

    @type String
  */
  ariaRole: 'slider',

  /**
    Bind this to the current value of the progress bar.  Note that by default
    an empty value will disable the progress bar and a multiple value too make
    it indeterminate.
  */
  value: 0.50,
  valueBindingDefault: SC.Binding.single().notEmpty(),

  /**
    The minimum value of the progress.
  */
  minimum: 0,
  minimumBindingDefault: SC.Binding.single().notEmpty(),

  /**
    Optionally specify the key used to extract the minimum progress value
    from the content object.  If this is set to null then the minimum value
    will not be derived from the content object.

    @type String
  */
  contentMinimumKey: null,

  /**
    The maximum value of the progress bar.
  */
  maximum: 1.0,
  maximumBindingDefault: SC.Binding.single().notEmpty(),

  /**
    Optionally specify the key used to extract the maximum progress value
    from the content object.  If this is set to null then the maximum value
    will not be derived from the content object.

    @type String
  */
  contentMaximumKey: null,

  /**
    Optionally set to the minimum step size allowed.

    All values will be rounded to this step size when displayed.
  */
  step: 0.1,

  // ..........................................................
  // INTERNAL PROPERTIES
  //

  displayProperties: ['displayValue', 'ariaValue', 'minimum', 'maximum', 'step', 'frame'],

  /**
   @property
   The raw, unchanged value to be provided to screen readers and the like.
  */
  ariaValue: function() {
    return this.get('value');
  }.property('value').cacheable(),

  // The name of the render delegate which is creating and maintaining
  // the DOM associated with instances of this view
  renderDelegateName: 'sliderRenderDelegate',

  displayValue: function() {
    var min = this.get('minimum'),
        max = this.get('maximum'),
        value = this.get('value'),
        step = this.get('step');

    // determine the constrained value.  Must fit within min & max
    value = Math.min(Math.max(value, min), max);

    // limit to step value
    if (!SC.none(step) && step !== 0) {
      value = Math.round(value / step) * step;
    }

    // determine the percent across
    if(value!==0) value = Math.floor((value - min) / (max - min) * 100);

    return value;
  }.property('value', 'minimum', 'maximum', 'step').cacheable(),

  _isMouseDown: NO,

  mouseDown: function(evt) {
    if (!this.get('isEnabledInPane')) return YES; // nothing to do...
    this.set('isActive', YES);
    this._isMouseDown = YES ;
    return this._triggerHandle(evt, YES);
  },

  // mouseDragged uses same technique as mouseDown.
  mouseDragged: function(evt) {
    return this._isMouseDown ? this._triggerHandle(evt) : YES;
  },

  // remove active class
  mouseUp: function(evt) {
    if (this._isMouseDown) this.set('isActive', NO);
    var ret = this._isMouseDown ? this._triggerHandle(evt) : YES ;
    this._isMouseDown = NO;
    return ret ;
  },

  mouseWheel: function(evt) {
    if (!this.get('isEnabledInPane')) return YES;
    var min = this.get('minimum'),
        max = this.get('maximum'),
        step = this.get('step'),
        newVal = this.get('value')+((evt.wheelDeltaX+evt.wheelDeltaY)*step),
        value = Math.round(newVal / step) * step ;
    if (newVal< min) this.setIfChanged('value', min);
    else if (newVal> max) this.setIfChanged('value', max);
    else this.setIfChanged('value', newVal);
    return YES ;
  },

  touchStart: function(evt){
    return this.mouseDown(evt);
  },

  touchEnd: function(evt){
    return this.mouseUp(evt);
  },

  touchesDragged: function(evt){
    return this.mouseDragged(evt);
  },

  /** @private
    Updates the handle based on the mouse location of the handle in the
    event.
  */
  _triggerHandle: function(evt, firstEvent) {
    var width = this.get('frame').width,
        min = this.get('minimum'), max=this.get('maximum'),
        step = this.get('step'), v=this.get('value'), loc;

    if(firstEvent){
      loc = this.convertFrameFromView({ x: evt.pageX }).x;
      this._evtDiff = evt.pageX - loc;
    }else{
      loc = evt.pageX-this._evtDiff;
    }

    // convert to percentage
    loc = Math.max(0, Math.min(loc / width, 1));

    // if the location is NOT in the general vicinity of the slider, we assume
    // that the mouse pointer or touch is in the center of where the knob should be.
    // otherwise, if we are starting, we need to do extra to add an offset
    if (firstEvent) {
      var value = this.get("value");
      value = (value - min) / (max - min);

      // if the value and the loc are within 16px
      if (Math.abs(value * width - loc * width) < 16) this._offset = value - loc;
      else this._offset = 0;
    }

    // add offset and constrain
    loc = Math.max(0, Math.min(loc + this._offset, 1));

    // convert to value using minimum/maximum then constrain to steps
    loc = min + ((max-min)*loc);
    if (step !== 0) loc = Math.round(loc / step) * step ;

    // if changes by more than a rounding amount, set v.
    if (Math.abs(v-loc)>=0.01) {
      this.set('value', loc); // adjust
    }

    return YES ;
  },

  /** tied to the isEnabledInPane state */
  acceptsFirstResponder: function() {
    if (SC.FOCUS_ALL_CONTROLS) { return this.get('isEnabledInPane'); }
    return NO;
  }.property('isEnabledInPane'),

  keyDown: function(evt) {
     // handle tab key
     if (evt.which === 9 || evt.keyCode === 9) {
       var view = evt.shiftKey ? this.get('previousValidKeyView') : this.get('nextValidKeyView');
       if(view) view.becomeFirstResponder();
       else evt.allowDefault();
       return YES ; // handled
     }
     if (evt.which >= 33 && evt.which <= 40){
       var min = this.get('minimum'),max=this.get('maximum'),
          step = this.get('step'),
          size = max-min, val=0, calculateStep, current=this.get('value');

       if (evt.which === 37 || evt.which === 38 || evt.which === 34 ){
         if(step === 0){
           if(size<100){
             val = current-1;
           }else{
             calculateStep = Math.abs(size/100);
             if(calculateStep<2) calculateStep = 2;
             val = current-calculateStep;
           }
         }else{
           val = current-step;
         }
       }
       if (evt.which === 39 || evt.which === 40 || evt.which === 33 ){
           if(step === 0){
              if(size<100){
                val = current + 2;
              }else{
                calculateStep = Math.abs(size/100);
                if(calculateStep<2) calculateStep =2;
                val = current+calculateStep;
              }
            }else{
              val = current+step;
            }
       }
       if (evt.which === 36){
         val=max;
       }
       if (evt.which === 35){
          val=min;
       }
       if(val>=min && val<=max) this.set('value', val);
     }else{
       evt.allowDefault();
       return NO;
     }
     return YES;
   },

   contentKeys: {
     'contentValueKey': 'value',
     'contentMinimumKey': 'minimum',
     'contentMaximumKey': 'maximum',
     'contentIsIndeterminateKey': 'isIndeterminate'
   }
});

/* >>>>>>>>>> BEGIN source/views/source_list_group.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('mixins/collection_group');
sc_require('views/disclosure');

/**
  @class
  
  Displays a group view in a source list.  Handles displaying a disclosure
  triangle which can be used to show/hide children.
  
  @extends SC.View
  @extends SC.Control
  @extends SC.CollectionGroup
  @author Charles Jolley
  @author Erich Ocean
  @version 1.0
  @since 0.9
*/
SC.SourceListGroupView = SC.View.extend(SC.Control, SC.CollectionGroup,
/** @scope SC.SourceListGroupView.prototype */ {
  
  /**
    @type Array
    @default ['sc-source-list-group']
    @see SC.View#classNames
  */
  classNames: ['sc-source-list-group'],
  
  // ..........................................................
  // KEY PROPERTIES
  // 
  
  /**
    The content object the source list group will display.
    
    @type SC.Object
    @default null
  */
  content: null,
  
  /**
    The current group visibility.  Used by the source list to determine the 
    layout size of the group.
    
    @type Boolean
    @default YES
  */
  isGroupVisible: YES,
  
  /** 
    YES if group is showing its titlebar.
    
    Group views will typically hide their header if the content is set to 
    null.  You can also override this method to always hide the header if 
    you want and the SourceListView will not leave room for it.
    
    @type Boolean
    @default YES
  */
  hasGroupTitle: YES,
  
  /**
    The content property key to use as the group view's title.
    
    @type String
    @default null
  */
  groupTitleKey: null,
  
  /**
    The content property key to use to determine if the group's children are 
    visible or not.
    
    @type String
    @default null
  */
  groupVisibleKey: null,
  
  /** @private */
  render: function(context, firstTime) {
    context.push('<div role="button" class="sc-source-list-label sc-disclosure-view sc-button-view button disclosure no-disclosure">',
              '<img src="'+SC.BLANK_IMAGE_URL+'" class="button" />',
              '<span class="label"></span></div>') ;
  },
  
  /** @private */
  createChildViews: function() {
    
  },
  
  /** @private */
  contentPropertyDidChange: function(target, key) {
    var content = this.get('content') ;
    var labelView = this.outlet('labelView') ;
    
    // hide labelView if content is null.
    if (content === null) {
      labelView.setIfChanged('isVisible', NO) ;
      this.setIfChanged('hasGroupTitle', NO) ;
      return ;
    } else {
      labelView.setIfChanged('isVisible', YES) ;
      this.setIfChanged('hasGroupTitle', YES) ;
    }
    
   // set the title if that changed.
    var groupTitleKey = this.getDelegateProperty('groupTitleKey', this.displayDelegate) ;
    if ((key == '*') || (groupTitleKey && (key == groupTitleKey))) {
      var title = (content && content.get && groupTitleKey) ? content.get(groupTitleKey) : content;
      if (title != this._title) {
        this._title = title ;
        if (title) title = title.capitalize() ;
        labelView.set('title', title) ;
      }
    }
    
    // set the group visibility if changed
    var groupVisibleKey = this.getDelegateProperty('groupVisibleKey', this.displayDelegate) ;
    if ((key == '*') || (groupVisibleKey && (key == groupVisibleKey))) {
      if (groupVisibleKey) {
        labelView.removeClassName('no-disclosure') ;
        
        var isVisible = (content && content.get) ?
          !!content.get(groupVisibleKey) :
          YES ;
        if (isVisible != this.get('isGroupVisible')) {
          this.set('isGroupVisible', isVisible) ;
          labelView.set('value', isVisible) ;
        }
      } else labelView.addClassName('no-disclosure') ;
    }
  },
  
  /** @private
    Called when the user clicks on the disclosure triangle
  */
  disclosureValueDidChange: function(newValue) {
    if (newValue == this.get('isGroupVisible')) return; // nothing to do
    
    // update group if necessary
    var group = this.get('content') ;
    var groupVisibleKey = this.getDelegateProperty('groupVisibleKey', this.displayDelegate) ;
    if (group && group.set && groupVisibleKey) {
      group.set(groupVisibleKey, newValue) ;
    }
    
    // update my own value and then update my collection view.
    this.set('isGroupVisible', newValue) ;
    if (this.owner && this.owner.updateChildren) this.owner.updateChildren(true) ;
    
  },
  
  /** @private */
  labelView: SC.DisclosureView.extend({
    
    /** @private */
    value: YES,
    
    /** @private
      If the disclosure value changes, call the owner's method.  Note
      normally you would do this with a binding, but since this is a semi-
      private class anyway, there is no reason to go to all that trouble.
    */
    _valueObserver: function() {
      if (this.owner) this.owner.disclosureValueDidChange(this.get('value')) ;
    }.observes('value')
    
  })
  
});

/* >>>>>>>>>> BEGIN source/views/source_list.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('views/list');
sc_require('views/source_list_group');

/** @class
  
  Displays a source list like the source list in iTunes.  SourceList views
  are very similar to ListView's but come preconfigured with the correct
  appearance and default behaviors of a source list.
  
  @extends SC.ListView
  @since SproutCore 1.0
*/
SC.SourceListView = SC.ListView.extend(
/** @scope SC.SourceListView.prototype */ {
  
  theme: 'source-list',

  /**
    @type Array
    @default ['sc-source-list']
    @see SC.View#classNames
  */
  classNames: ['sc-source-list'],
  
  /**
    Default row height for source list items is larger.
    
    @type Number
    @default 32
    @see SC.ListView#rowHeight
  */
  rowHeight: 32,

  /**
    By default source lists should not select on mouse down since you will
    often want to drag an item instead of selecting it.
    
    @type Boolean
    @default NO
    @see SC.ListView#selectOnMouseDown
  */
  selectOnMouseDown: NO,
  
  /**
    By default, SourceListView's trigger any action you set whenever the user
    clicks on an item.  This gives the SourceList a "menu" like behavior.
    
    @type Boolean
    @default YES
    @see SC.ListView#actOnSelect
  */
  actOnSelect: YES

});

/* >>>>>>>>>> BEGIN source/views/split_divider.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2010 Sprout Systems, Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('mixins/split_child');
sc_require('mixins/split_thumb');

/**
  @class

  A SplitDividerView sits between any two other views in a SplitView.
  The SplitDivider mixes in SC.SplitThumb to allow the user to drag
  it around. The dragging process will cause SC.SplitView to adjust
  other children as needed.

  @extends SC.View
  @author Alex Iskander
*/
SC.SplitDividerView = SC.View.extend(SC.SplitChild, SC.SplitThumb,
{
  /** @scope SC.SplitDividerView.prototype */
  classNames: ['sc-split-divider-view'],
  
  // set to prevent SC.SplitView from automatically creating dividers
  // to sit between this divider and another view.
  isSplitDivider: YES,

  // NOTE: 'sc-fixed-size' is only hard-coded because SC.SplitView requires
  // this file, and SC.FIXED_SIZE is defined inside SC.SplitView.
  autoResizeStyle: 'sc-fixed-size',
  
  movesSibling: SC.MOVES_CHILD,
  
  size: SC.propertyFromRenderDelegate('dividerSize', 10),

  renderDelegateName: 'splitDividerRenderDelegate'
});

/* >>>>>>>>>> BEGIN source/views/split.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2010 Sprout Systems, Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('views/split_divider');

/**
  Prevents the view from getting resized when the SplitView is resized,
  or the user resizes or moves an adjacent child view.
*/
SC.FIXED_SIZE = 'sc-fixed-size';

/**
  Prevents the view from getting resized when the SplitView is resized
  (unless the SplitView has resized all other views), but allows it to
  be resized when the user resizes or moves an adjacent child view.
*/
SC.RESIZE_MANUAL = 'sc-manual-size';

/**
  Allows the view to be resized when the SplitView is resized or due to
  the user resizing or moving an adjacent child view.
*/
SC.RESIZE_AUTOMATIC = 'sc-automatic-resize';


/**
  @class

  SC.SplitView arranges multiple views side-by-side or on top of each
  other.

  By default, SC.SplitView sets `size` and `position` properties on the
  child views, leaving it up to the child view to adjust itself. For good
  default behavior, mix SC.SplitChild into your child views.

  SplitView can resize its children to fit (the default behavior),
  or resize itself to fit its children--allowing you to build column-
  based file browsers and the like. As one child (a divider, most likely)
  is moved, SplitView can move additional children to get them out of the way.

  Setting Up SplitViews
  =======================================
  You can set up a split view like any other view in SproutCore:

      SplitView.design({
        childViews: ['leftPanel', 'rightPanel'],

        leftPanel: SC.View.design(SC.SplitChild, {
          minimumSize: 200
        }),

        rightPanel: SC.View.design(SC.SplitChild, {
          // it is usually the right panel you want to resize
          // as the SplitView resizes:
          autoResizeStyle: SC.RESIZE_AUTOMATIC
        })
      })

  Dividers
  ------------------------------------------
  Dividers are automatically added between every child view.

  You can specify what dividers to create in two ways:

  - Set splitDividerView to change the default divider view class to use.

  - Override splitDividerViewBetween(splitView, view1, view2), either in
    your subclass of SC.SplitView or in a delegate, and return the divider
    view instance that should go between the two views.

  As far as SplitView is concerned, dividers are actually just ordinary
  child views. They usually have an autoResizeStyle of SC.FIXED_SIZE, and
  usually mixin SC.SplitThumb to relay mouse and touch events to the SplitView.
  To prevent adding dividers between dividers and views or dividers and dividers,
  SC.SplitView marks all dividers with an isSplitDivider property.

  If you do not want to use split dividers at all, or wish to set them up
  manually in your childViews array, set splitDividerView to null.

  @extends SC.View
  @author Alex Iskander
*/
SC.SplitView = SC.View.extend({
  /**@scope SC.SplitView.prototype*/

  classNames: ['sc-split-view'],

  childViews: ['topLeftView', 'bottomRightView'],

  // used by the splitView computed property to find the nearest SplitView.
  isSplitView: YES,

  /**
   * The type of view to create for the divider views. SC.SplitDividerView by default.
   *
   * Should be a class, not an instance.
   *
   * @type {SC.View}
  */
  splitDividerView: SC.SplitDividerView,

  /**
   * Determines whether the SplitView should lay out its children
   * horizontally or vertically.
   *
   * Possible values:
   *
   * - SC.LAYOUT_HORIZONTAL: side-by-side
   * - SC.LAYOUT_VERTICAL: on top of each other
   *
   * @type LayoutDirection
  */
  layoutDirection: SC.LAYOUT_HORIZONTAL,

  /**
   * Determines whether the SplitView should attempt to resize its
   * child views to fit within the SplitView's own frame (the default).
   *
   * If NO, the SplitView will decide its own size based on its children.
   *
   * @type Boolean
   * @default YES
  */
  shouldResizeChildrenToFit: YES,

  /**
   * The cursor of the child view currently being dragged (if any).
   * This allows the cursor to be used even if the user drags "too far",
   * past the child's own boundaries.
   *
   * @type {String}
  */
  splitChildCursorStyle: null,

  /**
    @private
    Only occurs during drag, which only happens after render, so we
    update directly.
  */
  _scsv_splitChildCursorDidChange: function() {
    this.get('cursor').set('cursorStyle', this.get('splitChildCursorStyle'));
  }.observes('splitChildCursorStyle'),


  // set up the SC.Cursor instance that this view and all the subviews
  // will share.
  init: function() {
    this.cursor = SC.Cursor.create();
    arguments.callee.base.apply(this,arguments);
  },

  //
  // RENDERING
  // Things like layoutDirection must be rendered as class names.
  // We delegate to a render delegate.
  //
  displayProperties: ['layoutDirection'],
  renderDelegateName: 'splitRenderDelegate',

  //
  // UTILITIES
  //
  /**
   * @private
   * Returns either the width or the height of the SplitView's frame,
   * depending on the value of layoutDirection. If layoutDirection is
   * SC.LAYOUT_HORIZONTAL, this will return the SplitView's width; otherwise,
   * the SplitView's height.
   *
   * @property
   * @type {Number}
  */
  _frameSize: function(){
    if (this.get('layoutDirection') === SC.LAYOUT_HORIZONTAL) {
      return this.get('frame').width;
    } else {
      return this.get('frame').height;
    }
  }.property('frame', 'layoutDirection').cacheable(),

  viewDidResize: function () {
    this.scheduleTiling();

    arguments.callee.base.apply(this,arguments);
  },

  layoutDirectionDidChange: function() {
    this.scheduleTiling();
  }.observes('layoutDirection'),

  //
  // PUBLIC CHILD VIEW ADJUSTMENT API
  //
  /**
   * Attempts to adjust the position of a child view, such as a divider.
   *
   * The implementation for this may be overridden in the delegate method
   * splitViewAdjustPositionForChild.
   *
   * You may use this method to automatically collapse the view by setting
   * the view's position to the position of the next or previous view (accessible
   * via the child's nextView and previousView properties and the
   * getPositionForChild method).
   *
   * @param {SC.View} child The child to move.
   * @param {Number} position The position to move the child to.
   * @returns {Number} The position to which the child was actually moved.
  */
  adjustPositionForChild: function(child, position){
    return this.invokeDelegateMethod(this.get('delegate'), 'splitViewAdjustPositionForChild', this, child, position);
  },

  /**
   * Returns the position within the split view for a child view,
   * such as a divider. This position is not necessarily identical
   * to the view's actual layout 'left' or 'right'; that position could
   * be offset--for instance, to give a larger grab area to the divider.
   *
   * The implementation for this is in the delegate method
   * splitViewGetPositionForChild.
   *
   * @param {SC.View} child The child whose position to find.
   * @returns {Number} The position.
  */
  getPositionForChild: function(child){
    return this.invokeDelegateMethod(this.get('delegate'), 'splitViewGetPositionForChild', this, child);
  },

  //
  // CHILD VIEW MANAGEMENT
  //

  // When children are added and removed, we must re-run the setup process that
  // sets the SplitView child properties such as nextView, previousView, etc.,
  // and which adds dividers.
  didAddChild: function() {
    // we have to add a guard because _scsv_setupChildViews may add or remove
    // dividers, causing this method to be called again uselessly.
    // this is purely for performance. The guard goes here, rather than in
    // setupChildViews, because of the invokeOnce.
    if (this._scsv_settingUpChildViews) return;
    this._scsv_settingUpChildViews = YES;

    this.invokeOnce('_scsv_setupChildViews');

    this._scsv_settingUpChildViews = NO;
  },

  didRemoveChild: function() {
    // we have to add a guard because _scsv_setupChildViews may add or remove
    // dividers, causing this method to be called again uselessly.
    // this is purely for performance. The guard goes here, rather than in
    // setupChildViews, because of the invokeOnce.
    if (this._scsv_settingUpChildViews) return;
    this._scsv_settingUpChildViews = YES;

    this.invokeOnce('_scsv_setupChildViews');

    this._scsv_settingUpChildViews = NO;
  },

  createChildViews: function() {
    arguments.callee.base.apply(this,arguments);

    if (this._scsv_settingUpChildViews) return;
    this._scsv_settingUpChildViews = YES;

    this.invokeOnce('_scsv_setupChildViews');

    this._scsv_settingUpChildViews = NO;
  },

  /**
   * @private
   * During initialization and whenever the child views change, SplitView needs
   * to set some helper properties on the children and create any needed dividers.
   *
   * Note: If dividers are added, childViews changes, causing this to be called again;
   * this is proper, because this updates the nextView, etc. properties appropriately.
   *
   * The helper properties are: previousView, nextView, viewIndex.
  */
  _scsv_setupChildViews: function() {
    var del = this.get('delegate'),

        children = this.get('childViews').copy(), len = children.length, idx,
        child, lastChild, lastNonDividerChild,

        oldDividers = this._scsv_dividers || {}, newDividers = {}, divider, dividerId;

    // loop through all children, keeping track of the previous child
    // as we loop using the lastChild variable.
    for (idx = 0; idx < len; idx++) {
      child = children[idx];

      // do initial setup of things like autoResizeStyle:
      if (!child.get('autoResizeStyle')) {
        if (child.get('size') !== undefined) {
          child.set('autoResizeStyle', SC.RESIZE_MANUAL);
        } else {
          child.set('autoResizeStyle', SC.RESIZE_AUTOMATIC);
        }
      }

      // we initialize the size first thing in case the size is empty (fill)
      // if it is empty, the way we position the views would lead to inconsistent
      // sizes. In addition, we will constrain all initial sizes so they'll be valid
      // when/if we auto-resize them.
      var size = this.invokeDelegateMethod(del, 'splitViewGetSizeForChild', this, child);
      size = this.invokeDelegateMethod(del, 'splitViewConstrainSizeForChild', this, child, size);
      this.invokeDelegateMethod(del, 'splitViewSetSizeForChild', this, child, size);

      child.previousView = lastChild;
      child.nextView = undefined;
      child.viewIndex = idx;

      if (lastChild) {
        lastChild.nextView = child;
      }

      if (lastNonDividerChild && !child.isSplitDivider) {
        dividerId = SC.guidFor(lastNonDividerChild) + "-" + SC.guidFor(child);

        divider = oldDividers[dividerId];

        // if the previous view is a divider, but is not in our set of dividers,
        // then it is manually created. If it is manually created, we should not
        // create a new one.
        if (!divider && !lastChild.isSplitDivider) {
          divider = this.invokeDelegateMethod(del, 'splitViewDividerBetween', this, lastNonDividerChild, child);
        }

        if (divider) {
          divider.isSplitDivider = YES;
          newDividers[dividerId] = divider;

          if (oldDividers[dividerId]) {
            delete oldDividers[dividerId];
          } else {
            this.insertBefore(divider, child);
          }
        }
      }


      lastChild = child;
      if (!child.isSplitDivider) lastNonDividerChild = child;
    }

    // finally, remove all dividers that we didn't keep
    for (dividerId in oldDividers) {
      oldDividers[dividerId].destroy();
    }

    this._scsv_dividers = newDividers;

    // retile immediately.
    this._scsv_tile();
  },

  //
  // BASIC LAYOUT CODE
  //

  /**
    Whether the SplitView needs to be re-laid out. You can change this by
    calling scheduleTiling.
  */
  needsTiling: YES,

  /**
    Schedules a retile of the SplitView.
  */
  scheduleTiling: function() {
    this.set('needsTiling', YES);
    this.invokeOnce('_scsv_tile');
  },

  tileIfNeeded: function() {
    if (!this.get('needsTiling')) return;
    this._scsv_tile();
  },

  /**
   * @private
   * Tiling is the simpler of two layout paths. Tiling lays out all of the
   * children according to their size, and, if shouldResizeChildrenToFit is
   * YES, attempts to resize the children to fit in the SplitView.
   *
   * It is called when the child views are initializing or have changed, and
   * when the SplitView is resized.
   *
  */
  _scsv_tile: function() {
    var del = this.get('delegate');

    // LOGIC:
    //
    // - Call splitViewLayoutChildren delegate method to position views and
    //   find total size.
    //
    // - If meant to automatically resize children to fit, run the
    //   splitViewResizeChildrenToFit delegate method.
    //
    // - Call splitViewLayoutChildren again if splitViewResizeChildrenToFit was called.
    //
    // - If not meant to automatically resize children to fit, change the SplitView
    //   size to match the total size of all children.

    var size, frameSize = this.get('_frameSize');

    size = this.invokeDelegateMethod(del, 'splitViewLayoutChildren', this);

    if (this.get('shouldResizeChildrenToFit') && size !== frameSize) {
      this.invokeDelegateMethod(del, 'splitViewResizeChildrenToFit', this, size);
      size = this.invokeDelegateMethod(del, 'splitViewLayoutChildren', this);
    }

    if (!this.get('shouldResizeChildrenToFit')) {
      if (this.get('layoutDirection') === SC.LAYOUT_HORIZONTAL) {
        this.adjust('width', size);
      } else {
        this.adjust('height', size);
      }
    }

    this.set('needsTiling', NO);
  },

  /**
   * Lays out the children one next to each other or one on top of the other,
   * based on their sizes. It returns the total size.
   *
   * You may override this method in a delegate.
   *
   * @param {SC.SplitView} splitView The SplitView whose children need layout.
   * @returns {Number} The total size of all the SplitView's children.
  */
  splitViewLayoutChildren: function(splitView) {
    var del = this.get('delegate');

    var children = this.get('childViews'), len = children.length, idx,
        child, pos = 0;

    for (idx = 0; idx < len; idx++) {
      child = children[idx];

      this.invokeDelegateMethod(del, 'splitViewSetPositionForChild', this, children[idx], pos);
      pos += this.invokeDelegateMethod(del, 'splitViewGetSizeForChild', this, children[idx]);
    }

    return pos;
  },

  /**
   * Attempts to resize the child views of the split view to fit in the SplitView's
   * frame. So it may proportionally adjust the child views, the current size of the
   * SplitView's content is passed.
   *
   * You may override this method in a delegate.
   *
   * @param {SC.SplitView} splitView The SC.SplitView whose children should be resized.
   * @param {Number} contentSize The current not-yet-resized size of the SplitView's content.
  */
  splitViewResizeChildrenToFit: function(splitView, contentSize) {
    var del = this.get('delegate');

    // LOGIC:
    //
    //   - 1) Size auto-resizable children in proportion to their existing sizes to attempt
    //     to fit within the target size— auto-resizable views have autoResizeStyle set
    //     to SC.RESIZE_AUTOMATIC.
    //
    //   - 2) Size non-auto-resizable children in proportion to their existing sizes—these
    //     views will _not_ have an autoResizeStyle of SC.RESIZE_AUTOMATIC.
    //

    var frameSize = this.get('_frameSize');
    var children = this.get('childViews'), len = children.length, idx,
        child, resizableSize = 0, nonResizableSize = 0, childSize;

    // To do this sizing while keeping things proportionate, the total size of resizable
    // views and the total size of non-auto-resizable views must be calculated independently.
    for (idx = 0; idx < len; idx++) {
      child = children[idx];

      childSize = this.invokeDelegateMethod(del, 'splitViewGetSizeForChild', this, child);

      if (this.invokeDelegateMethod(del, 'splitViewShouldResizeChildToFit', this, child)) {
        resizableSize += childSize;
      } else {
        nonResizableSize += childSize;
      }
    }

    var runningSize = contentSize;

    // we run through each twice: non-aggressively, then aggressively. This is controlled by providing
    // a -1 for the outOfSize. This tells the resizing to not bother with proportions and just resize
    // whatever it can.
    runningSize = this._resizeChildrenForSize(runningSize, frameSize, YES, resizableSize);
    runningSize = this._resizeChildrenForSize(runningSize, frameSize, YES, -1);
    runningSize = this._resizeChildrenForSize(runningSize, frameSize, NO, nonResizableSize);
    runningSize = this._resizeChildrenForSize(runningSize, frameSize, NO, -1);
  },

  /**
   * @private
   * Utility method used by splitViewResizeChildrenToFit to do the proportionate
   * sizing of child views.
   *
   * @returns {Number} The new runningSize.
  */
  _resizeChildrenForSize: function(runningSize, targetSize, useResizable, outOfSize) {
    var del = this.get('delegate');

    var children = this.get('childViews'), idx, len = children.length, child;

    var diff = targetSize - runningSize;
    for (idx = 0; idx < len; idx++) {
      child = children[idx];

      var originalChildSize = this.invokeDelegateMethod(del, 'splitViewGetSizeForChild', this, child),
          size = originalChildSize;

      var isResizable = this.invokeDelegateMethod(del, 'splitViewShouldResizeChildToFit', this, child);
      if (isResizable === useResizable) {
        // if outOfSize === -1 then we are aggressively resizing (not resizing proportionally)
        if (outOfSize === -1) size += diff
        else size += (size / outOfSize) * diff;

        size = Math.round(size);

        size = this.invokeDelegateMethod(del, 'splitViewConstrainSizeForChild', this, child, size);
        this.invokeDelegateMethod(del, 'splitViewSetSizeForChild', this, child, size);


        // we remove the original child size—but we don't add it back.
        // we don't add it back because the load is no longer shared.
        if (outOfSize !== -1) outOfSize -= originalChildSize;
      }

      // We modify the old size to account for our changes so we can keep a running diff
      runningSize -= originalChildSize;
      runningSize += size;
      diff = targetSize - runningSize;
    }

    return runningSize;
  },

  /**
   * Determines whether the SplitView should attempt to resize the specified
   * child view when the SplitView's size changes.
   *
   * You may override this method in a delegate.
   *
   * @param {SC.SplitView} splitView The SplitView that owns the child.
   * @param {SC.View} child The child view.
   * @returns {Boolean}
  */
  splitViewShouldResizeChildToFit: function(splitView, child) {
    return (
      this.get('shouldResizeChildrenToFit')  &&
      child.get('autoResizeStyle') === SC.RESIZE_AUTOMATIC
    );
  },

  /**
   * Attempts to move a single child from its current position to
   * a desired position.
   *
   * You may override the behavior on a delegate.
   *
   * @param {SC.SplitView} splitView The splitView whose child should be moved.
   * @param {SC.View} child The child which should be moved.
   * @param {Number} position The position to attempt to move the child to.
   * @returns {Number} The final position of the child.
  */
  splitViewAdjustPositionForChild: function(splitView, child, position) {
    var del = this.get('delegate');
    // Unlike tiling, the process of moving a child view is much more sophisticated.
    //
    // The basic sequence of events is simple:
    //
    //  - resize previous child
    //  - resize the child itself to compensate for its movement if
    //    child.compensatesForMovement is YES.
    //  - adjust position of next child.
    //
    // As the process is recursive in both directions (resizing a child may attempt
    // to move it if it cannot be resized further), adjusting one child view could
    // affect many _if not all_ of the SplitView's children.
    //
    // For safety, sanity, and stability, the recursive chain-reactions only travel
    // in one direction; for instance, resizing the previous view may attempt to adjust
    // its position, but that adjustment will not propagate to views after it.
    //
    // This process, while powerful, has one complication: if you change a bunch of views
    // before a view, and then _fail_ to move views after it, the views before must be
    // moved back to their starting points. But if their positions were changed directly,
    // this would be impossible.
    //
    // As such, the positions are not changed directly. Rather, the changes are written
    // to a _plan_, and changes only committed once everything is finalized.
    //
    // splitViewAdjustPositionForChild is the entry point, and as such is responsible
    // for triggering the creation of the plan, the needed modifications, and the
    // finalizing of it.
    var plan = this._scsv_createPlan();
    var finalPosition = this._scsv_adjustPositionForChildInPlan(plan, child, position, child);
    this._scsv_commitPlan(plan);

    return finalPosition;
  },

  /**
   * @private
   * Creates a plan in which to prepare changes to the SplitView's children.
   *
   * A plan is an array with the same number of elements as the SplitView has children.
   * Each element is a hash containing these properties:
   *
   * - child: the view the hash represents
   * - originalPosition: the position before the planning process
   * - position: the planned new position.
   * - originalSize: the size before the planning process
   * - size: the planned new size.
   *
   * The repositioning and resizing logic can, at any time, reset part of the plan
   * to its original state, allowing layout processes to be run non-destructively.
   * In addition, storing the original positions and sizes is more performant
   * than looking them up each time.
   *
   * @returns {Plan}
  */
  _scsv_createPlan: function() {
    var del = this.get('delegate'),
        plan = [], children = this.get('childViews'), idx, len = children.length,
        child, childPosition, childSize;

    for (idx = 0; idx < len; idx++) {
      child = children[idx];
      childPosition = this.invokeDelegateMethod(del, 'splitViewGetPositionForChild', this, child);
      childSize = this.invokeDelegateMethod(del, 'splitViewGetSizeForChild', this, child);

      plan[idx] = {
        child: child,
        originalPosition: childPosition,
        position: childPosition,
        originalSize: childSize,
        size: childSize
      };
    }

    return plan;
  },

  /**
    * @private
    * Resets a range of the plan to its original settings.
    *
    * @param {Plan} plan The plan.
    * @param {Number} first The first item in the range.
    * @param {Number} last The last item in the range.
   */
   _scsv_resetPlanRange: function(plan, first, last) {
     for (var idx = first; idx <= last; idx++) {
       plan[idx].position = plan[idx].originalPosition;
       plan[idx].size = plan[idx].originalSize;
     }
   },

  /**
   * @private
   * Commits the changes specified in the plan to the child views.
   *
   * @param {Plan} plan The plan with the changes.
  */
  _scsv_commitPlan: function(plan) {
    var del = this.get('delegate'), len = plan.length, idx, item, end = 0;

    for (idx = 0; idx < len; idx++) {
      item = plan[idx];
      if (item.size !== item.originalSize) {
        this.invokeDelegateMethod(del, 'splitViewSetSizeForChild', this, item.child, item.size);
      }

      if (item.position !== item.originalPosition) {
        this.invokeDelegateMethod(del, 'splitViewSetPositionForChild', this, item.child, item.position);
      }

      end = item.position + item.size;
    }


    if (!this.get('shouldResizeChildrenToFit')) {
      if (this.get('layoutDirection') === SC.LAYOUT_HORIZONTAL) {
        this.adjust('width', end);
      } else {
        this.adjust('height', end);
      }
    }
  },

  /**
   * Moves the specified child view as close as it can to the specified
   * position, saving all changes this causes into the plan.
   *
   * The "directness" of the action also comes into play. An action is direct if:
   *
   * - The child being modified is the originating child (the one being dragged, most likely)
   * - The child is being _positioned_ as is immediately _after_ the originating child.
   * - The child is being _sized_ and is immediately _before_ the originating child.
   *
   * This means that direct actions modify the originating child or the border between
   * it and a sibling. Some child views don't like to accept indirect actions, as the
   * indirect actions may confuse or annoy users in some cases.
   *
   * @param {Plan} plan The plan write changes to (and get some data from).
   * @param {SC.View} child The child to move.
   * @param {Number} position The position to attempt to move the child to.
   * @param {Boolean} source The child from which the attempt to adjust originated—used
   * to determine directness.
   *
   * @returns {Number} The final position of the child.
  */
  _scsv_adjustPositionForChildInPlan: function(plan, child, position, source) {
    var del = this.get('delegate');

    if (
      !child.get('allowsIndirectAdjustments') &&
      source !== child && source !== child.previousView
    ) {
      return plan[child.viewIndex].position;
    }

    // since the process is recursive, we need to prevent the processing from
    // coming back in this direction.
    if (child._splitViewIsAdjusting) {
      return plan[child.viewIndex].position;
    }

    child._splitViewIsAdjusting = YES;

    //
    // STEP 1: attept to resize the previous child.
    //
    var previousChild = child.previousView, nextChild = child.nextView,
        previousChildPosition, previousChildSize,
        nextChildPosition, nextChildSize,
        size = plan[child.viewIndex].size;

    if (previousChild && !previousChild._splitViewIsAdjusting) {
      // we determine the size we would like it to be by subtracting its position
      // from the position _we_ would like to have.
      previousChildPosition = plan[previousChild.viewIndex].position;
      previousChildSize = position - previousChildPosition;

      previousChildSize = this._scsv_adjustSizeForChildInPlan(
        plan, previousChild, previousChildSize, source
      );

      // the child may not have resized/moved itself all the way, so we will
      // recalculate the target position based on how much it _was_ able to.
      position = previousChildPosition + previousChildSize;
    } else if (!previousChild) {
      // if there is no previous child view, then this is the first view and
      // as such _must_ be at 0.
      position = 0;
    }

    // further steps deal with children _after_ this one; these steps should
    // not be performed if those children are already being taken care of.
    if (nextChild && nextChild._splitViewIsAdjusting) {
      child._splitViewIsAdjusting = NO;
      plan[child.viewIndex].position = position;
      return position;
    }


    //
    // STEP 2: attempt to resize this view to avoid moving the next one.
    // Only occurs if the view's settings tell it to compensate _and_ there is a
    // next view to compensate for, or we are resizing to fit and there _is no_ next child.
    //
    if (child.get('compensatesForMovement') && nextChild) {
      nextChildPosition = plan[nextChild.viewIndex].position;
      size = this._scsv_adjustSizeForChildInPlan(plan, child, nextChildPosition - position);
    } else if (!nextChild && this.get('shouldResizeChildrenToFit')) {
      nextChildPosition = this.get('_frameSize');
      size = this._scsv_adjustSizeForChildInPlan(plan, child, nextChildPosition - position);
      position = nextChildPosition - size;
    }

    // STEP 3: attempt to move the next child to account for movement of this one.
    if (nextChild) {
      nextChildPosition = position + size;
      nextChildPosition = this._scsv_adjustPositionForChildInPlan(plan, nextChild, nextChildPosition, source);
    }

    // if we were unable to position the next child, or there is no next
    // child but we need to resize children to fit, we have to undo some
    // of our previous work.
    if (nextChildPosition && position !== nextChildPosition - size) {
      position = nextChildPosition - size;

      // then, for whatever is left, we again resize the previous view, after throwing
      // away the previous calculations.
      if (previousChild && !previousChild._splitViewIsAdjusting) {
        this._scsv_resetPlanRange(plan, 0, previousChild.viewIndex);
        previousChildSize = position - plan[previousChild.viewIndex].position;
        this._scsv_adjustSizeForChildInPlan(plan, previousChild, previousChildSize, child);
      }

    }


    plan[child.viewIndex].position = position;
    child._splitViewIsAdjusting = NO;
    return position;
  },

  _scsv_adjustSizeForChildInPlan: function(plan, child, size, source) {
    var del = this.get('delegate');

    if (
      source &&
      !child.get('allowsIndirectAdjustments') &&
      source !== child && source !== child.nextView && source !== child.previousView
    ) {
      return plan[child.viewIndex].size;
    }

    // First, see if resizing alone will do the job.
    var actualSize = this.invokeDelegateMethod(del, 'splitViewConstrainSizeForChild', this, child, size);

    plan[child.viewIndex].size = actualSize;

    if (size === actualSize) return size;

    // if not, attempt to move the view.
    var currentPosition = plan[child.viewIndex].position,
        targetPosition = currentPosition + size - actualSize;

    var position = this._scsv_adjustPositionForChildInPlan(plan, child, targetPosition, source);

    // the result is the new right edge minus the old left edge—that is,
    // the size we can pretend we are for the caller, now that we have
    // resized some other views.
    return position + actualSize - currentPosition;
  },

  /**
   * Returns a view instance to be used as a divider between two other views,
   * or null if no divider should be used.
   *
   * The value of the 'splitDividerView' property will be instantiated. The default
   * value of this property is 'SC.SplitDividerView'. If the value is null or undefined,
   * null will be returned, and the SplitView will not automatically create dividers.
   *
   * You may override this method in a delegate.
   *
   * @param {SC.SplitView} splitView The split view that is hte parent of the
   * two views.
   * @param {SC.View} view1 The first view.
   * @param {SC.View} view2 The second view.
   * @returns {SC.View} The view instance to use as a divider.
  */
  splitViewDividerBetween: function(splitView, view1, view2){
    if (!this.get('splitDividerView')) return null;

    return this.get('splitDividerView').create();
  },

  /**
   * Returns the current position for the specified child.
   *
   * You may override this in a delegate.
   *
   * @param {SC.SplitView} splitView The SplitView which owns the child.
   * @param {SC.View} child The child.
   * @returns Number
  */
  splitViewGetPositionForChild: function(splitView, child) {
    return child.get('position');
  },

  /**
   * Sets the position for the specified child.
   *
   * You may override this in a delegate.
   *
   * @param {SC.SplitView} splitView The SplitView which owns the child.
   * @param {SC.View} child The child.
   * @param {Number} position The position to move the child to.
  */
  splitViewSetPositionForChild: function(splitView, child, position) {
    child.set('position', position);
  },

  /**
   * Returns the current size for the specified child.
   *
   * You may override this in a delegate.
   *
   * @param {SC.SplitView} splitView The SplitView which owns the child.
   * @param {SC.View} child The child.
   * @returns Number
  */
  splitViewGetSizeForChild: function(splitView, child) {
    var size = child.get('size');
    if (SC.none(size)) return 100;

    return size;
  },

  /**
   * Sets the size for the specified child.
   *
   * You may override this in a delegate.
   *
   * @param {SC.SplitView} splitView The SplitView which owns the child.
   * @param {SC.View} child The child.
   * @param {Number} position The size to give the child.
  */
  splitViewSetSizeForChild: function(splitView, child, size) {
    child.set('size', size);
  },

  /**
   * Returns the nearest valid size to a proposed size for a child view.
   * By default, constrains the size to the range specified by the child's
   * minimumSize and maximumSize properties, and returns 0 if the child
   * has canCollapse set and the size is less than the child's collapseAtSize.
   *
   * You may override this in a delegate.
   *
   * @param {SC.SplitView} splitView The SplitView which owns the child.
   * @param {SC.View} child The child.
   * @param {Number} position The proposed size for the child.
   * @returns Number
  */
  splitViewConstrainSizeForChild: function(splitView, child, size) {
    if (child.get('autoResizeStyle') === SC.FIXED_SIZE) {
      return this.invokeDelegateMethod(this.get('delegate'), 'splitViewGetSizeForChild', this, child);
    }

    if (child.get('canCollapse')) {
      var collapseAtSize = child.get('collapseAtSize');
      if (collapseAtSize && size < collapseAtSize) return 0;
    }

    var minSize = child.get('minimumSize') || 0;
    if (minSize !== undefined && minSize !== null) size = Math.max(minSize, size);

    var maxSize = child.get('maximumSize');
    if (maxSize !== undefined && maxSize !== null) size = Math.min(maxSize, size);

    return size;
  }
});

/* >>>>>>>>>> BEGIN source/views/stacked.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('views/collection');

/**
  @class

  A StackedView is a CollectionView that expects its content to use static
  layout to stack vertically.  This type of collection view is not designed
  for use with large size collections, but it can be very useful for
  collections with complex displays and variable heights such as comments or
  small notification queues.

  ## Static Layout

  This view makes no attempt to size or position your child views.  It assumes
  you are using StaticLayout for your child views.  If you don't enable static
  layout your views will probably overlay on top of each other and will look
  incorrect.

  Note also that the default layout for this view set's the height to "auto".
  This is usually the behavior you will want.

  @extends SC.CollectionView
  @since SproutCore 0.9
*/
SC.StackedView = SC.CollectionView.extend(
/** @scope SC.StackedView.prototype */ {

  /**
    @type Array
    @default ['sc-stacked-view']
    @see SC.View#classNames
  */
  classNames: ['sc-stacked-view'],

  /**
    Default layout for a stacked view will fill the parent view but auto-
    adjust the height of the view.

    @type Hash
    @default `{ top: 0, left: 0, right: 0, height: 1 }`
    @see SC.View#layout
  */
  layout: { top: 0, left: 0, right: 0, height: 1 },

  /**
    Return full range of its indexes for nowShowing

    @param {Rect} rect
    @returns {SC.IndexSet} full range of indexes
  */
  computeNowShowing: function () {
    return this.get('allContentIndexes');
  },

  /**
    Updates the height of the stacked view to reflect the current content of
    the view.  This is called automatically whenever an item view is reloaded.
    You can also call this method directly if the height of one of your views
    has changed.

    The height will be recomputed based on the actual location and dimensions
    of the last child view.

    Note that normally this method will defer actually updating the height
    of the view until the end of the run loop.  You can force an immediate
    update by passing YES to the "immediately" parameter.

    @param {Boolean} immediately YES to update immediately
    @returns {SC.StackedView} receiver
  */
  updateHeight: function (immediately) {
    if (immediately) this._updateHeight();
    else this.invokeLast(this._updateHeight);
    // ^ use invokeLast() here because we need to wait until all rendering has
    //   completed.

    return this;
  },

  /** @private */
  _updateHeight: function () {

    var childViews = this.get('childViews'),
        len        = childViews.get('length'),
        view, layer, height;

    if (len === 0) {
      height = 1;
    } else {
      view = childViews.objectAt(len - 1);
      layer = view ? view.get('layer') : null;
      height = layer ? (layer.offsetTop + layer.offsetHeight) : 1;
      layer = null; // avoid memory leaks
    }
    this.adjust('minHeight', height);
    this.set('calculatedHeight', height);
  },

  // ..........................................................
  // INTERNAL SUPPORT
  //

  /** @private
    Whenever the collection view reloads some views, reset the cache on the
    frame as well so that it will recalculate.
  */
  reloadIfNeeded: function () {
    arguments.callee.base.apply(this,arguments);

    return this.updateHeight();
  },

  /** @private
    When layer is first created, make sure we update the height using the
    newly calculated value.
  */
  didCreateLayer: function () { return this.updateHeight(); }

});

/* >>>>>>>>>> BEGIN source/views/static_content.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/** @class

  StaticContentView allows you to display arbitrary HTML content inside your
  view hierarchy.

  Normally, views in SproutCore are absolutely positioned. Their width and
  height are either pre-determined, or specified relative to their enclosing
  view. Occasionally, you may want to display content that is laid out by
  the browser. For example, if you were writing a documentation browser, you
  may want to display the table of contents as an SC.ListView, but the actual
  pages as HTML content.

  This class is most useful when placed inside a ScrollView.

  To use it, simply set the `content` property to a string of the HTML you
  would like to display.

  @extends SC.View
  @since SproutCore 1.2
  @author Tom Dale
*/
SC.StaticContentView = SC.View.extend(
/** @scope SC.StaticContentView.prototype */ {

  /**
    @type Array
    @default ['sc-static-content-view']
    @see SC.View#classNames
  */
  classNames: ['sc-static-content-view'],

  /**
    @type Array
    @default ['content']
    @see SC.View#displayProperties
  */
  displayProperties: ['content'],


  // ..........................................................
  // PROPERTIES
  //

  /**
    The HTML content you wish to display. This will be inserted directly into
    the DOM, so ensure that any user-generated content has been escaped.

    @type String
    @default null
  */
  content: null,

  // ..........................................................
  // METHODS
  //

  /**
    Because SproutCore has no way of knowing when the size of the content
    inside a StaticContentView has changed, you should call this method
    whenever an event that may change the size of the content occurs.

    Note that if you change the content property, this will be recalculated
    automatically.
  */
  contentLayoutDidChange: function() {
    this._viewFrameDidChange();
  },

  // ..........................................................
  // INTERNAL SUPPORT
  //

  /** @private
    Disable SproutCore management of view positioning.
  */
  useStaticLayout: YES,

  /** @private
    Overrides SC.View's frame computed property, and returns a value from the
    DOM. This value is cached to improve performance.

    If the size of the content inside the view changes, you should call
    contentLayoutDidChange().

    @property
  */
  frame: function() {
    var layer = this.get('layer'), rect;

    if (!layer) return { x: 0, y: 0, width: 0, height: 0 };

    if (layer.getBoundingClientRect && !SC.browser.isIE8OrLower) {
      rect = layer.getBoundingClientRect();

      return { x: 0, y: 0, width: rect.width, height: rect.height };
    } else {
      return { x: 0, y: 0, width: layer.clientWidth, height: layer.clientHeight };
    }
  }.property('content').cacheable(),

  /** @private
    Recalculate content frame if our parent view resizes.
  */
  parentViewDidResize: function() {
    this.contentLayoutDidChange();
  },

  /** @private
    If the layer changes, make sure we recalculate the frame.
  */
  didUpdateLayer: function() {
    this.contentLayoutDidChange();
  },

  /** @private
    Outputs the content property to the DOM.

    @param {SC.RenderContext} context
    @param {Boolean} firstTime
  */
  render: function(context, firstTime) {
    var content = this.get('content');

    context.push(content || '');
  },

  /** @private */
  touchStart: function(evt){
    evt.allowDefault();
    return YES;
  },

  /** @private */
  touchEnd: function(evt){
    evt.allowDefault();
    return YES;
  }

});

/* >>>>>>>>>> BEGIN source/views/tab.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('views/segmented');

/**
  @static
  @type String
  @constant
*/
SC.TOP_LOCATION = 'top';

/**
  @static
  @type String
  @constant
*/
SC.TOP_TOOLBAR_LOCATION = 'top-toolbar';

/**
  @static
  @type String
  @constant
*/
SC.BOTTOM_LOCATION = 'bottom';

/**
  @class

  Incorporates a segmented view and a container view to display the selected
  tab.  Provide an array of items, which will be passed onto the segmented
  view.

  @extends SC.View
  @since SproutCore 1.0
*/
SC.TabView = SC.View.extend(
/** @scope SC.TabView.prototype */ {

  /**
    @type Array
    @default ['sc-tab-view']
    @see SC.View#classNames
  */
  classNames: ['sc-tab-view'],

  /**
    @type Array
    @default ['nowShowing']
    @see SC.View#displayProperties
  */
  displayProperties: ['nowShowing'],

  // ..........................................................
  // PROPERTIES
  //

 /**
    Set nowShowing with the page you want to display.

    @type String
    @default null
  */
  nowShowing: null,

  /**
    @type Array
    @default []
  */
  items: [],

  /**
    @type String
    @default null
  */
  itemTitleKey: null,

  /**
    @type String
    @default null
  */
  itemValueKey: null,

  /**
    @type String
    @default null
  */
  itemIsEnabledKey: null,

  /**
    @type String
    @default null
  */
  itemIconKey: null,

  /**
    @type String
    @default null
  */
  itemWidthKey: null,

  /**
    @type String
    @default null
  */
  itemToolTipKey: null,

  /**
    @type Number
    @default SC.REGULAR_BUTTON_HEIGHT
  */
  tabHeight: SC.REGULAR_BUTTON_HEIGHT,

  /**
    Possible values:

      - SC.TOP_LOCATION
      - SC.TOP_TOOLBAR_LOCATION
      - SC.BOTTOM_LOCATION

    @type String
    @default SC.TOP_LOCATION
  */
  tabLocation: SC.TOP_LOCATION,

  /**
    If set, then the tab location will be automatically saved in the user
    defaults.  Browsers that support localStorage will automatically store
    this information locally.

    @type String
    @default null
  */
  userDefaultKey: null,


  // ..........................................................
  // FORWARDING PROPERTIES
  //

  // forward important changes on to child views
  /** @private */
  _tab_nowShowingDidChange: function() {
    var v = this.get('nowShowing');
    this.get('containerView').set('nowShowing',v);
    this.get('segmentedView').set('value',v);
    return this ;
  }.observes('nowShowing'),

  /** @private */
  _tab_saveUserDefault: function() {
    // if user default is set, save also
    var v = this.get('nowShowing');
    var defaultKey = this.get('userDefaultKey');
    if (defaultKey) {
      SC.userDefaults.set([defaultKey,'nowShowing'].join(':'), v);
    }
  }.observes('nowShowing'),

  /** @private */
  _tab_itemsDidChange: function() {
    this.get('segmentedView').set('items', this.get('items'));
    return this ;
  }.observes('items'),

  /** @private
    Restore userDefault key if set.
  */
  init: function() {
    arguments.callee.base.apply(this,arguments);
    this._tab_nowShowingDidChange()._tab_itemsDidChange();
  },

  /** @private */
  awake: function() {
    arguments.callee.base.apply(this,arguments);
    var defaultKey = this.get('userDefaultKey');
    if (defaultKey) {
      defaultKey = [defaultKey,'nowShowing'].join(':');
      var nowShowing = SC.userDefaults.get(defaultKey);
      if (!SC.none(nowShowing)) this.set('nowShowing', nowShowing);
    }

  },

  /** @private */
  createChildViews: function() {
    var childViews  = [], containerView, layout,
        tabLocation = this.get('tabLocation'),
        tabHeight   = this.get('tabHeight'),
        controlSize = this.get('controlSize');

    if (tabLocation === SC.TOP_LOCATION) {
      layout = { top: tabHeight/2+1, left: 0, right: 0, bottom: 0, border: 1 };
    } else if (tabLocation === SC.TOP_TOOLBAR_LOCATION) {
      layout = { top: tabHeight+1, left: 0, right: 0, bottom: 0, border: 1 };
    } else {
      layout = { top: 0, left: 0, right: 0, bottom: (tabHeight/2) - 1, border: 1 };
    }

    containerView = this.containerView.extend({
      layout: layout,
      //adding the role
      ariaRole: 'tabpanel'
    });

    this.containerView = this.createChildView(containerView) ;

    //  The segmentedView managed by this tab view.  Note that this TabView uses
    //  a custom segmented view.  You can access this view but you cannot change
    // it.
    layout = (tabLocation === SC.TOP_LOCATION ||
              tabLocation === SC.TOP_TOOLBAR_LOCATION) ?
             { height: tabHeight, left: 0, right: 0, top: 0 } :
             { height: tabHeight, left: 0, right: 0, bottom: 0 } ;

    this.segmentedView = this.get('segmentedView').extend({
      layout: layout,

      controlSize: controlSize,

      /** @private
        When the value changes, update the parentView's value as well.
      */
      _sc_tab_segmented_valueDidChange: function() {
        var pv = this.get('parentView');
        if (pv) pv.set('nowShowing', this.get('value'));
      }.observes('value'),

      /** @private */
      init: function() {
        // before we setup the rest of the view, copy key config properties
        // from the owner view...
        var pv = this.get('parentView');
        if (pv) {
          SC._TAB_ITEM_KEYS.forEach(function(k) { this[k] = pv.get(k); }, this);
        }
        return arguments.callee.base.apply(this,arguments);
      }
    });

    this.segmentedView = this.createChildView(this.segmentedView) ;

    childViews.push(this.containerView);
    childViews.push(this.segmentedView);

    this.set('childViews', childViews);
    return this;
  },

  // ..........................................................
  // COMPONENT VIEWS
  //

  /**
    The containerView managed by this tab view.  Note that TabView uses a
    custom container view.  You can access this view but you cannot change
    it.

    @type SC.View
    @default SC.ContainerView
    @readOnly
  */
  containerView: SC.ContainerView.extend({ renderDelegateName: 'wellRenderDelegate' }),

  /**
    @type SC.View
    @default SC.SegmentedView
  */
  segmentedView: SC.SegmentedView

}) ;

SC._TAB_ITEM_KEYS = ['itemTitleKey', 'itemValueKey', 'itemIsEnabledKey', 'itemIconKey', 'itemWidthKey', 'itemToolTipKey', 'itemActionKey', 'itemTargetKey'];

/* >>>>>>>>>> BEGIN source/views/thumb.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2010 Sprout Systems, Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/**
  @class
  @deprecated Use a normal view and mix-in SC.SplitThumb.

  Kept to allow a modicum of backwards-compatibility. Please use
  a normal view and mix in SC.SplitThumb instead.

  @extends SC.View
  @author Alex Iskander
  @test in split
*/
SC.ThumbView = SC.View.extend(SC.SplitThumb,
/** @scope SC.ThumbView.prototype */ {
  classNames: ['sc-thumb-view'],
  
  init: function() {
    arguments.callee.base.apply(this,arguments);
    console.warn("SC.ThumbView is deprecated. Please use a normal view and mix in SC.SplitThumb instead.");
  }
});

/* >>>>>>>>>> BEGIN source/views/web.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/** @class

  Used to display an iframe. The source, (specified by the value property) of
  the iFrame should be from the same domain. (i.e. the src / value should be
  from the same domain) if you want to access the contents of the iframe.

  @extends SC.View
  @extends SC.Control
  @since SproutCore 1.0
*/
SC.WebView = SC.View.extend(SC.Control, {/** @scope SC.WebView.prototype */
  classNames: 'sc-web-view',

  /**
    @type Array
    @default ['value', 'shouldAutoResize']
    @see SC.View#displayProperties
  */
  displayProperties: ['value', 'shouldAutoResize'],

  /**
    The content of the iframe can be bigger than the size specified when creating
    the view. If you want the view to be auto-resized to the dimensions of the
    iframe, then set the value of this property to YES.
    The web view can be auto resized only if the contents are from the same
    domain as the parent domain.

    @type Boolean
    @default NO
  */
  shouldAutoResize: NO,

  /**
    @param {SC.RenderContext} context
    @param {Boolean} firstTime
  */
  render: function(context, firstTime) {
    var src = this.get('value') || '',
      iframe;

    if (firstTime) {
      context.push('<iframe src="' + src +
      '" style="position: absolute; width: 100%; height: 100%; border: 0px; margin: 0px; padding: 0px;"></iframe>');
    }
    else if(src!==this._lastSrc) {
      iframe = this.$('iframe');
      // clear out the previous src, to force a reload
      iframe.attr('src', 'javascript:;');
      iframe.attr('src', src);
    }

    this._lastSrc = src;
  },

  /**
    Called when the layer gets created.
  */
  didCreateLayer: function() {
    var f = this.$('iframe');
    // Attach an onload event to the iframe.
    SC.Event.add(f, 'load', this, this.iframeDidLoad);
  },

  /**
    Called before the layer gets destroyed.
  */
  willDestroyLayer: function() {
    var f = this.$('iframe');
    // Remove the onload event so that the iframe can be released
    SC.Event.remove(f, 'load', this, this.iframeDidLoad);
  },

  /**  @private
    Called when iframe onload event is fired.
    1. Resizes the view to fit the contents of the iframe using the
    scroll width and scroll height of the contents of the iframe

    The iframe contents can be accessed only when the src is from the same
    domain as the parent document
  */
  iframeDidLoad: function() {

    //fit the iframe to size of the contents.
    if (this.get('shouldAutoResize') === YES) {
      var contentWindow;
      var iframeElt = this.$('iframe')[0];
      if(iframeElt && iframeElt.contentWindow) {
        contentWindow = iframeElt.contentWindow;
        if(contentWindow && contentWindow.document && contentWindow.document.documentElement){
          var docElement = contentWindow.document.documentElement;
          // setting the width before the height gives more accurate results..
          // at least for the test iframe content i'm using.
          //TODO: try out document flows other than top to bottom.
          if (!SC.browser.isIE) {
            this.$().width(docElement.scrollWidth);
            this.$().height(docElement.scrollHeight);
          }
          else {
            this.$().width(docElement.scrollWidth + 12);
            this.$().height(docElement.scrollHeight + 5);
          }
        }
      }
    }
  }

});

/* >>>>>>>>>> BEGIN source/views/well.js */
// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/**
  @static
  @constant
  @type Number
  @default 15
*/
SC.WELL_CONTAINER_PADDING = 15;

/** @class

  A WellView is a ContainerView with a border. It's useful when you want to
  group a set of views. It allows you to easily switch its contents too.
  
  It has a default contentLayout that will replace the layout of the contentView.
  
  @extends SC.ContainerView
  @since SproutCore 1.0
  @test in progress
*/
SC.WellView = SC.ContainerView.extend(
/** @scope SC.WellView.prototype */ {
  
  /**
    @type Array
    @default ['sc-well-view']
    @see SC.View#classNames
  */
  classNames: 'sc-well-view',
  
  /**
    Layout for the content of the container view.
    @type Hash
  */
  contentLayout: {
    top: SC.WELL_CONTAINER_PADDING,
    bottom: SC.WELL_CONTAINER_PADDING,
    left: SC.WELL_CONTAINER_PADDING,
    right: SC.WELL_CONTAINER_PADDING
  },
  
  /**
    @type String
    @default 'wellRenderDelegate'
  */
  renderDelegateName: 'wellRenderDelegate',
  
  /** @private
     Overrides createChildViews and replaces the layout of the contentView
     with the one in contentLayout.
   */
  createChildViews: function() {
    // if contentView is defined, then create the content
    var view = this.get('contentView') ;
    if (view) {
      view = this.contentView = this.createChildView(view) ;
      view.set('layout', this.contentLayout);
      this.childViews = [view] ;
    } 
  },

  /** @private
     Invoked whenever the content property changes.  This method will simply
     call replaceContent and set the contentLayout in the new contentView.
     
     Override replaceContent to change how the view is
     swapped out.
   */
  contentViewDidChange: function() {
    var view = this.get('contentView');
    view.set('layout', this.contentLayout);
    this.replaceContent(view);
  }.observes('contentView')
  
}) ;

