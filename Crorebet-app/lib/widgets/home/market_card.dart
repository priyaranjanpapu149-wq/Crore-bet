import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import '../../models/market.dart';

class MarketCard extends StatelessWidget {
  final Market market;
  final VoidCallback onPlay;
  final VoidCallback onChart;
  const MarketCard({super.key, required this.market, required this.onPlay, required this.onChart});

  @override
  Widget build(BuildContext context) {
    const green = Color(0xFF043B2A);
    const gold = Color(0xFFCEAE72);
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF0D1),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: gold),
        boxShadow: const [BoxShadow(color: Color(0x1A382A13), blurRadius: 5, offset: Offset(0, 2))],
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(children: [
        Material(color: green, child: InkWell(onTap: onChart, child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          child: Row(children: [
            Expanded(child: Text(market.name, maxLines: 1, overflow: TextOverflow.ellipsis,
              style: const TextStyle(color: Colors.white, fontFamily: 'serif', fontWeight: FontWeight.bold, fontSize: 16))),
            const SizedBox(width: 8),
            const Text('✦', style: TextStyle(color: gold, fontSize: 12)),
            const SizedBox(width: 8),
            Container(padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
              decoration: BoxDecoration(color: market.isClosed ? const Color(0xFFE7E0D0) : const Color(0xFFC9F0BC), borderRadius: BorderRadius.circular(20)),
              child: Row(mainAxisSize: MainAxisSize.min, children: [
                Icon(Icons.circle, size: 7, color: market.isClosed ? Colors.grey : Colors.green),
                const SizedBox(width: 4),
                Text(market.statusText, maxLines: 1, style: const TextStyle(color: green, fontSize: 10, fontWeight: FontWeight.bold)),
              ])),
          ]),
        ))),
        Padding(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
          child: FittedBox(fit: BoxFit.scaleDown, child: Text(market.resultDisplay.replaceAll('-', ' - '),
            style: const TextStyle(color: Color(0xFF002F1D), fontFamily: 'serif', fontWeight: FontWeight.w900, fontSize: 28, letterSpacing: 1)))),
        Container(height: 1, color: const Color(0xFFE4CA99)),
        Padding(padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6), child: Row(children: [
          Expanded(child: _time('open_time'.tr(), market.openTimeDisplay)),
          Expanded(child: _time('close_time'.tr(), market.closeTimeDisplay)),
          SizedBox(height: 33, child: ElevatedButton(onPressed: onPlay,
            style: ElevatedButton.styleFrom(backgroundColor: green, foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(horizontal: 13),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
            child: Row(mainAxisSize: MainAxisSize.min, children: [Text('play_game'.tr(), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)), const Icon(Icons.chevron_right, size: 18)]))),
        ])),
      ]),
    );
  }

  Widget _time(String label, String value) => Row(children: [
    const Icon(Icons.access_time, color: Color(0xFF063D30), size: 14),
    const SizedBox(width: 3),
    Expanded(child: Text('$label: $value', maxLines: 1, overflow: TextOverflow.ellipsis,
      style: const TextStyle(color: Color(0xFF063D30), fontSize: 10, fontWeight: FontWeight.w600))),
  ]);
}
