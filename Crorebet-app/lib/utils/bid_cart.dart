void removePlacedBidGroups(
  List<Map<String, dynamic>> cart,
  Set<String> completed, {
  bool byGameType = false,
}) {
  cart.removeWhere((bid) {
    final session = bid['session'].toString();
    final key = byGameType ? '${bid['apiGameType']}|$session' : session;
    return completed.contains(key);
  });
}
