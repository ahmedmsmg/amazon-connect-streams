(function (connect) {
   // 'connect' is passed as a parameter to avoid using the global variable.

   /**-------------------------------------------------------------------------
    * GraphLink
    *
    * Represents the association of one or more attributes to a state transition.
    */
   function GraphLink(fromState, toState) {
      connect.assertNotNull(fromState, 'fromState');
      connect.assertNotNull(toState, 'toState');
      this.fromState = fromState;
      this.toState = toState;
   }

   GraphLink.prototype.getAssociations = function (context) {
      throw connect.NotImplementedError();
   };

   GraphLink.prototype.getFromState = function () {
      return this.fromState;
   };

   GraphLink.prototype.getToState = function () {
      return this.toState;
   };

   /**-------------------------------------------------------------------------
    * DirectGraphLink (inherits from GraphLink)
    *
    * Represents the by-value representation of one or more attributes to a
    * state transition.
    */
   function DirectGraphLink(fromState, toState, associations) {
      connect.assertNotNull(fromState, 'fromState');
      connect.assertNotNull(toState, 'toState');
      connect.assertNotNull(associations, 'associations');
      GraphLink.call(this, fromState, toState);
      this.associations = associations;
   }
   DirectGraphLink.prototype = Object.create(GraphLink.prototype);
   DirectGraphLink.prototype.constructor = DirectGraphLink;

   DirectGraphLink.prototype.getAssociations = function (context) {
      return this.associations;
   };

   /**-------------------------------------------------------------------------
    * FunctionalGraphLink (inherits from GraphLink)
    *
    * Represents a functional association of one or more attributes to a
    * state transition.
    */
   function FunctionalGraphLink(fromState, toState, closure) {
      connect.assertNotNull(fromState, 'fromState');
      connect.assertNotNull(toState, 'toState');
      connect.assertNotNull(closure, 'closure');
      connect.assertTrue(connect.isFunction(closure), 'closure must be a function');
      GraphLink.call(this, fromState, toState);
      this.closure = closure;
   }
   FunctionalGraphLink.prototype = Object.create(GraphLink.prototype);
   FunctionalGraphLink.prototype.constructor = FunctionalGraphLink;

   FunctionalGraphLink.prototype.getAssociations = function (context) {
      return this.closure(context, this.getFromState(), this.getToState());
   };

   /**-------------------------------------------------------------------------
    * EventGraph
    *
    * Builds a map of associations from one state to another in context of a
    * particular object.
    */
   function EventGraph() {
      this.fromMap = {};
   }
   EventGraph.ANY = "<<any>>";

   EventGraph.prototype.assoc = function (fromStateObj, toStateObj, assocObj) {
      var self = this;

      if (!fromStateObj) {
         throw new Error("fromStateObj is not defined.");
      }

      if (!toStateObj) {
         throw new Error("toStateObj is not defined.");
      }

      if (!assocObj) {
         throw new Error("assocObj is not defined.");
      }

      if (Array.isArray(fromStateObj)) {
         fromStateObj.forEach(function (fromState) {
            self.assoc(fromState, toStateObj, assocObj);
         });
      } else if (Array.isArray(toStateObj)) {
         toStateObj.forEach(function (toState) {
            self.assoc(fromStateObj, toState, assocObj);
         });
      } else {
         var assoc;
         if (typeof assocObj === "function") {
            assoc = new FunctionalGraphLink(fromStateObj, toStateObj, assocObj);
         } else if (Array.isArray(assocObj)) {
            assoc = new DirectGraphLink(fromStateObj, toStateObj, assocObj);
         } else {
            assoc = new DirectGraphLink(fromStateObj, toStateObj, [assocObj]);
         }
         this._addAssociation(assoc);
      }
      return this;
   };

   EventGraph.prototype.getAssociations = function (context, fromState, toState) {
      connect.assertNotNull(fromState, 'fromState');
      connect.assertNotNull(toState, 'toState');
      var associations = [];

      var toMapFromAny = this.fromMap[EventGraph.ANY] || {};
      var toMap = this.fromMap[fromState] || {};

      associations = associations.concat(this._getAssociationsFromMap(
         toMapFromAny, context, fromState, toState));
      associations = associations.concat(this._getAssociationsFromMap(
         toMap, context, fromState, toState));

      return associations;
   };

   EventGraph.prototype._addAssociation = function (assoc) {
      var fromState = assoc.getFromState();
      var toState = assoc.getToState();

      var toMap = this.fromMap[fromState];
      if (!toMap) {
         toMap = this.fromMap[fromState] = {};
      }

      var assocList = toMap[toState];
      if (!assocList) {
         assocList = toMap[toState] = [];
      }

      assocList.push(assoc);
   };

   EventGraph.prototype._getAssociationsFromMap = function (map, context, fromState, toState) {
      var assocList = (map[EventGraph.ANY] || []).concat(map[toState] || []);
      return assocList.reduce(function (prev, assoc) {
         return prev.concat(assoc.getAssociations(context));
      }, []);
   };

   connect.EventGraph = EventGraph;

})(this.connect || {});
