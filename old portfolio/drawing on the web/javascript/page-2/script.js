$(window).scroll(function() {
  var scroll = $(window).scrollTop();
  if ($(window).scrollTop() > 10) {
    $(".logo").removeClass("load");
    $(".child-1").addClass("show");
  }

  if ($(window).scrollTop() < 120) {
    $(".logo").addClass("load");
    $(".child-1").removeClass("show");
  }
});