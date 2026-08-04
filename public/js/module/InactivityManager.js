InactivityManager = (function (Events) {

  var InactivityManager = {};

  $.extend(true, InactivityManager, Events, {

    init: function () {
      this.toStopSeconds = 60;
      this.$container = null;
      this.cancelActions = null;
    },

    appStatusAction: function($container, stopActions, cancelActions) {
      this.$container = $container;
      this.cancelActions = cancelActions;
      
      if (!User.hasCredentials() || !User.isLicenseActivated() || this.isShown() || User.getInactivityTime() <= 0) {
        return;
      }

      console.log("Verifying app status");
      // var last = User.getLastInteraction();
      // var inactivityTime = User.getInactivityTime();
      
      // if (last) {
      //   var now = getTodayDate();
      //   var diff = getTimeDifference(now, last, "seconds");
      //   console.log(diff + "/" + inactivityTime + " to execute actions for no activity");
      //   if (diff >= inactivityTime) {
      //       //resetAppStatusTimer()
      //       this.noActivityActions($container, stopActions);
      //   }
      // }

      if (this.isTimeToShowInactivityAlert()) {
        this.noActivityActions($container, stopActions);
      } 
    },

    isTimeToShowInactivityAlert: function() {
      var last = User.getLastInteraction();
      var inactivityTime = User.getInactivityTime();
      
      if (last) {
        var now = getTodayDate();
        var diff = getTimeDifference(now, last, "seconds");
        console.log(diff + "/" + inactivityTime + " to execute actions for no activity");
        return (diff >= inactivityTime);
      }

      return false;
    },

    noActivityActions: function($container, stopActions) {
      this.$inactivityDialog = $container.find(".inactiviy-dialog:first");
      if (!this.$parentalControlDlg || this.$parentalControlDlg.length == 0) {
        $container.append(this.getHmlContent());
        this.$inactivityDialog = $container.find(".inactiviy-dialog:first");
      }

      if (!this.$inactivityDialog || this.$inactivityDialog.length == 0) {
        return false;
      }

      this.toStopSeconds = 60;
      this.$container = $container;
      this.$message = this.$inactivityDialog.find(".inactivity-message:first");
      this.$okButton = this.$inactivityDialog.find(".inactivity-continue-button:first");
      
      this.$message.text(__("PlayerToStopDueInactivity").replace("%s", this.toStopSeconds));
      this.$okButton.text(__("PlayerToStopDueInactivityContinue"));
      this.$inactivityDialog.modal("show");

      this.$inactivityDialog.on('shown.bs.modal', function () {
        Focus.to(self.$okButton);
      });

      var self = this;
      this.toStopInterval = setInterval(function () {
        self.toStopSeconds -= 1;
        self.$message.text(__("PlayerToStopDueInactivity").replace("%s", self.toStopSeconds));
        
        if (self.toStopSeconds <= 0) {
          self.stopInactivityDialog(true, stopActions);
        }
      }, 1000);
    },

    stopInactivityDialog: function(stopPlayer, stopActions) {
      clearInterval(this.toStopInterval);
      this.toStopInterval = null;

      this.$inactivityDialog.modal("hide");

      if (stopPlayer && stopActions != null) {
        stopActions();
      } else if (this.cancelActions) {
        this.cancelActions();
      }
    },

    continueWatching: function() {
      this.stopInactivityDialog(false, null);
    },

    onEnter: function ($el) {
      if ($el.is(this.$okButton)) {
        this.continueWatching();
      }
    },

    getHmlContent: function () {
      return '<div class="modal fade alerts nb-alert inactiviy-dialog" role="dialog">'
        + '<div class="modal-dialog modal-center">'
        + '<div class="modal-content">'
        + '<div class="modal-body">'
        + '<div>'
        + '<label class="inactivity-message" style="font-size: 1.4em"></label>'
        + '</div>'
        + '</div>'
        + '<div class="modal-footer">'
        + '<button type="button" class="btn-default btn-lg focusable inactivity-continue-button" data-dismiss="modal" data-parent-type="inactivity"></button>'
        + '<p class="pin-alert-message" style="text-align: center; margin-bottom: 1em;"></p>'
        + '</div>'
        + '</div></div></div>';;
    },

    isShown: function () {
      return this.$inactivityDialog && this.$inactivityDialog.hasClass("in");
    },

  });

  InactivityManager.init();

  return InactivityManager;
})(Events);