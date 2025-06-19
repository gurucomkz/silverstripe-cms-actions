/* global $, window, document, jQuery */

/**
 * Custom admin tweaks
 */
(function ($) {
    $.entwine("ss", function ($) {
        // Load tab if set in url
        var tabLoaded = false;
        var scrollInterval = null;
        var scrollChecks = 0;
        $("ul.ui-tabs-nav a").entwine({
            onmatch: function () {
                this._super();

                if (tabLoaded) {
                    return;
                }

                // Load any tab if specified
                var url = this.attr("href"),
                    hash = url.split("#")[1];

                if (window.location.hash) {
                    var currHash = window.location.hash.substring(1);
                    if (currHash == hash) {
                        this.trigger("click");
                        tabLoaded = true;

                        //TODO: find a better solution than this
                        // Also check .scroll-padding-top in .css file
                        scrollInterval = setInterval(function () {
                            scrollChecks++;
                            if (document.body.scrollTop > 0) {
                                // Anchor scrolled the page and may have hidden the header
                                document.body.scrollTop = 0;
                                window.scrollTo(0, 0);
                                clearInterval(scrollInterval);
                            }
                            if (scrollChecks > 20 && scrollInterval) {
                                clearInterval(scrollInterval);
                            }
                        }, 100);
                    }
                }
            },
            onclick: function () {
                var input = $("#js-form-active-tab");
                if (!input.length) {
                    // Add an input that track active tab
                    input = $(
                        '<input type="hidden" name="_activetab" class="no-change-track" id="js-form-active-tab" />',
                    );
                    $("#Form_ItemEditForm").append(input);
                }
                var url = this.attr("href");
                var split = url.split("#");
                var hash = split[1];

                // Replace state without changing history (because it would break back functionnality)
                window.history.replaceState(undefined, undefined, url);

                input.val(hash);
            },
        });

        // Prevent navigation for no ajax, otherwise it triggers the action AND navigate to edit form
        $(".grid-field__icon-action.no-ajax,.custom-link.no-ajax").entwine({
            onmatch: function () {},
            onunmatch: function () {},
            onclick: function (e) {
                if (this.hasClass("confirm")) {
                    var confirmed = confirm($(this).data("message"));
                    if (!confirmed) {
                        // Prevent submission
                        e.preventDefault();
                        return;
                    }
                }

                if (this.attr("target") == "_blank") {
                    // Maybe not necessary?
                    e.stopPropagation();
                } else {
                    // Prevent ajax submission
                    e.preventDefault();

                    // This will update history
                    document.location.href = this.attr("href");
                }
            },
        });

        $("#Form_EditForm_action_gridfieldsaveall").entwine({
            onclick: function (e) {
                // .submit() does not work, but trigger("submit", [this]) works somehow...
                this.parents("form").trigger("submit", [this]);
            },
        });

        // Allow posting from CmsInlineFormAction
        $("button.inline-action[data-action]").entwine({
            onclick: function (e) {
                e.preventDefault();
                var form = this.parents("form");

                // elemental compat
                var elementalArea = $(".elementalarea");
                var elementPresent = false;
                if (elementalArea.length) {
                    if (!elementalArea.hasClass("elemental-area--read-only")) {
                        elementalArea.addClass("elemental-area--read-only");
                        elementPresent = true;
                    }
                }

                // store current form action
                var action = form.attr("action");
                var submitSelector = this.data("submit-selector");

                // submit using our custom action
                form.attr("action", this.data("action"));

                if (submitSelector) {
                    $(submitSelector).click();
                } else {
                    // somehow this does nothing?
                    form.submit();
                }

                // restore handler, give it some time to process
                setTimeout(function () {
                    form.attr("action", action);

                    if (elementPresent) {
                        elementalArea.removeClass("elemental-area--read-only");
                    }
                }, 100);
            },
        });

        // Handle progressive actions
        function progressiveCall(inst, url, formData) {
            $.ajax({
                headers: { "X-Progressive": 1 },
                type: "POST",
                data: formData,
                url: url,
                dataType: "json",
                success: function (data) {
                    if (data === null) {
                        jQuery.noticeAdd({
                            text: "Invalid handler",
                            stayTime: 1000,
                            inEffect: { left: "0", opacity: "show" },
                        });
                        return;
                    }
                    // Progress can return messages
                    if (data.message) {
                        jQuery.noticeAdd({
                            text: data.message,
                            stayTime: 1000,
                            inEffect: { left: "0", opacity: "show" },
                        });
                    }
                    // It's finished!
                    if (data.progress_step >= data.progress_total) {
                        if (!data.label) {
                            data.label = "Completed";
                        }
                        inst.find("span").text(data.label);
                        inst.find(".btn__progress").remove();

                        if (data.reload) {
                            window.location.reload();
                        }
                        if (data.url) {
                            window.location.href = data.url;
                        }
                        return;
                    }
                    // Update progress data
                    if (data.progress_step) {
                        formData["progress_step"] = data.progress_step;
                    }
                    if (data.progress_total) {
                        formData["progress_total"] = data.progress_total;
                    }
                    if (data.progress_id) {
                        formData["progress_id"] = data.progress_id;
                    }
                    if (data.progress_data) {
                        formData["progress_data"] = data.progress_data;
                    }
                    // Update UI
                    if (data.progress_step && data.progress_total) {
                        var perc = Math.round((data.progress_step / data.progress_total) * 100);
                        inst.find("span").text(perc + "%");
                        inst.find(".btn__progress").css("width", perc);
                    }
                    progressiveCall(inst, url, formData);
                },
                error: function (e) {
                    inst.find("span").text("Failed");
                    console.error("Invalid response");
                },
            });
        }
        $(".progressive-action").entwine({
            onclick: function (e) {
                e.preventDefault();

                if (this.hasClass("disabled")) {
                    return;
                }

                if (this.hasClass("confirm")) {
                    var confirmed = confirm($(this).data("message"));
                    if (!confirmed) {
                        return;
                    }
                }

                var url = this.data("url");
                if (!url) {
                    url = this.attr("href");
                }
                var form = this.closest("form");
                var formData = {};
                var csrf = form.find('input[name="SecurityID"]').val();
                // Add csrf
                if (csrf) {
                    formData["SecurityID"] = csrf;
                }

                // Add current button
                formData[this.attr("name")] = this.val();

                // And step
                formData["progress_step"] = 0;

                // Total can be preset
                if (typeof this.data("progress-total") !== "undefined" && this.data("progress-total") !== null) {
                    formData["progress_total"] = this.data("progress-total");
                }

                // Cosmetic things
                this.addClass("disabled");
                if (!this.find("span").length) {
                    this.html("<span>" + this.text() + "</span>");
                }
                this.css("width", this.outerWidth());
                this.find("span").text("Please wait");
                this.append('<div class="btn__progress"></div>');

                progressiveCall(this, url, formData);
                return false;
            },
        });
    });
})(jQuery);
