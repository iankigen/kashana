define([
    'require', // Require is needed for solving circular dependency
    'backbone',
    'views/base_view',
    'views/input_view',
    'views/editable-text',
    'views/editable/rating',
    'views/generic/list',
    'views/activity/container',
], function (require, Backbone, BaseView, Editable,
    EditableText, EditableRating, ListView, ActivityContainer) {
    var OverviewItem = BaseView.extend({
        tagName: "div",
        className: function () {
            var cls = "result-overview",
		level = this.model.get("level");
            // Automatically open results on levels up to open_result_level
            if (level <= Aptivate.data.conf.open_result_level) {
                cls += " show";
                this.show = true;
            } else {
                this.show = false;
            }
	    if (level) {
                cls += " level-" + level;
	    }
            return cls;
        },
        template_selector: "#result-overview-container",

        events: {
            "click .edit-result, .monitor-result": "followLink",
            "click .toggle-triangle": "toggleDetails"
        },

        followLink: function (e) {
            e.preventDefault();
            Aptivate.status.router.navigate(
                this.$(e.target).attr("href"), {trigger: true});
        },

        setShow: function (target, show) {
            var action = show ? "addClass" : "removeClass";
            this.$(target).parents("table")
                          .parent()
                          .add(target) // Change also on toggle
                          [action]("show");
        },

        toggleDetails: function (e) {
            var seen = $(e.target).hasClass("show");

            this.show = !seen;
            this.setShow(e.target, this.show);
            
            if(this.show){
	            for(var i=this.model.get("level") + 1; i <= Aptivate.data.conf.max_result_level; i++) {
	            	var cls = ".result-overview.level-" + i;
	            		
	            	$(e.delegateTarget).find(cls).each(function (index, target) {
	            		target = $(target);
	            		
	            		if(target.hasClass("show") && !target.find(".toggle-triangle:first").hasClass("show")){
	            			target.find(".toggle-triangle:first").addClass("show");
	            		} 
	            		else if(!target.hasClass("show") && target.find(".toggle-triangle:first").hasClass("show")) {
	            			target.find(".toggle-triangle:first").removeClass("show");
	            		}
	            		
	            	});
	            }
            }
            
            if (!this.rerendered) {
                this.render();
                this.rerendered = true;
                // e.target here points to the wrong element (the one already
                // removed from DOM)
                if (this.show) {
                    this.$(".toggle-triangle:first").addClass("show");
                } else {
                    this.$(".toggle-triangle:first").removeClass("show");
                }
            }
            e.stopPropagation();
        },

        // INIT
        initialize: function () {
            var model_id = this.model.get("id");
            this.model.activities = Aptivate.logframe.activities.subcollection({
                filter: function (activity) {
                    return activity.get("result") === model_id;
                }
            });

            Backbone.Subviews.add(this);
            this.$el.addClass("level-" + this.model.get("level"));
        },

        getTemplateData: function (data) {
            if (this.model.get("level") <= Aptivate.data.conf.open_result_level) {
                data.open_toggle = " show";
            }
            return data;
        },

        subviewCreators: {
            resultName: function () {
                return new Editable({
                    model: this.model,
                    template_selector: "#editable-title",
                    attributes: { class: "ribbon ribbon-result" },
                });
            },
            resultDescription: function () {
                return new EditableText({
                    model: this.model,
                    template_selector: "#editable-description"
                });
            },
            resultRating: function () {
                return new EditableRating({
                    model: this.model,
                    options: Aptivate.data.ratings
                });
            },
            overviewItems: function () {
                return this.show ? this.renderSubItems() : null;
            }
        },

        renderSubItems: function () {
                var level = this.model.get('level'),
                    logframe = this.model.get('log_frame'),
                    resultId = this.model.get('id');
                if (level < Aptivate.data.conf.max_result_level) {
                    return this.resultOverviewView(logframe, resultId, level);
                } else {
                    return this.activityOverviewView(logframe, resultId, level);
                }
        },

        resultOverviewView: function (logframe, result, level){
            var model_id = this.model.get("id"),
                collection = Aptivate.logframe.results.subcollection({
                    filter: function (result) {
                        return result.get("parent") === model_id;
                    }
                });
            var listView = new ListView({
                className: "result-children",
                itemView: OverviewItem,
                collection: collection,
                newModelOptions: {
                    log_frame: logframe,
                    parent: result,
                    level: level + 1
                }
            });
            return listView;
        },

        activityOverviewView: function (logframe, result, level) {
            return new ListView({
                className: "activity-container",
                itemView: ActivityContainer,
                collection: this.model.activities,
                itemViewOptions: {
		    level: level + 1
		},
                newModelOptions: {
                    log_frame: logframe,
                    result: result
                }
            });
        }
    });

    return OverviewItem;
});
