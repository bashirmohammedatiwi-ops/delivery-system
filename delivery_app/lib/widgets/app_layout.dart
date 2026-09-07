import 'package:flutter/material.dart';

/// Layout helpers — only the bottom navigation bar stays fixed; scroll content uses these insets.
class AppLayout {
  AppLayout._();

  static bool isCompactHeight(BuildContext context) =>
      MediaQuery.sizeOf(context).height < 680;

  static bool isNarrowWidth(BuildContext context) =>
      MediaQuery.sizeOf(context).width < 360;

  /// Extra padding at the end of scroll views (keyboard / home indicator breathing room).
  static double scrollBottomInset(BuildContext context) =>
      MediaQuery.viewPaddingOf(context).bottom + 16;

  static EdgeInsets scrollPadding(BuildContext context, {
    double horizontal = 16,
    double top = 12,
    double bottomExtra = 8,
  }) {
    return EdgeInsets.fromLTRB(
      horizontal,
      top,
      horizontal,
      scrollBottomInset(context) + bottomExtra,
    );
  }
}
