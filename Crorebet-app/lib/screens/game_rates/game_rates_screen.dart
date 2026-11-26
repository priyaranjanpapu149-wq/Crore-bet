import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../config/colors.dart';
import '../../services/api_service.dart';
import '../../widgets/cosmic_background.dart';

class GameRatesScreen extends StatefulWidget {
  const GameRatesScreen({super.key});

  @override
  State<GameRatesScreen> createState() => _GameRatesScreenState();
}

class _GameRatesScreenState extends State<GameRatesScreen> {
  final _api = ApiService();
  bool _loading = true;

  List<_Section> _sections = [
    _Section(
      title: 'Game Win Ratio for all Bids',
      rows: [
        _Row('Single', '10/100'),
        _Row('Jodi', '10/1000'),
        _Row('Single Panna', '10/1600'),
        _Row('Double Panna', '10/3200'),
        _Row('Triple Panna', '10/10000'),
        _Row('Half Sangam', '10/12000'),
        _Row('Full Sangam', '10/120000'),
      ],
    ),
    _Section(
      title: 'Main Starline Game Win Ratio',
      rows: [
        _Row('Single', '10/100'),
        _Row('Single Panna', '10/1500'),
        _Row('Double Panna', '10/3000'),
        _Row('Triple Panna', '10/0'),
      ],
    ),
    _Section(
      title: 'Main Jackpot Win Ratio',
      rows: [
        _Row('Single', '10/90'),
        _Row('Jodi', '10/90'),
      ],
    ),
  ];

  @override
  void initState() {
    super.initState();
    _loadRates();
  }

  Future<void> _loadRates() async {
    try {
      final res = await _api.getHome();
      final rates = res['data']?['rates'];
      if (rates is Map) {
        final secs = rates['sections'];
        if (secs is List && secs.isNotEmpty) {
          _sections = secs.map((s) {
            final rows = (s['rows'] as List? ?? [])
                .map((r) => _Row(
              r['name']?.toString() ?? '',
              r['value']?.toString() ?? '',
            ))
                .toList();
            return _Section(
              title: s['title']?.toString() ?? '',
              rows: rows,
            );
          }).toList();
        }
      }
    } catch (_) {}
    if (!mounted) return;
    setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0A4A35),
      body: CosmicBackground(
        child: SafeArea(
          child: Column(
            children: [
              _header(context),
              Expanded(
                child: _loading
                    ? const Center(
                  child: CircularProgressIndicator(
                    color: AppColors.gold,
                  ),
                )
                    : ListView.builder(
                  padding: const EdgeInsets.fromLTRB(14, 8, 14, 24),
                  physics: const BouncingScrollPhysics(),
                  itemCount: _sections.length,
                  itemBuilder: (_, i) => _sectionBlock(_sections[i]),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _header(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(4, 10, 12, 10),
      child: Row(
        children: [
          IconButton(
            icon: const Icon(
              Icons.arrow_back_ios_new_rounded,
              color: Color(0xFFF5F8FF),
              size: 22,
            ),
            onPressed: () => Navigator.pop(context),
          ),
          Expanded(
            child: Text(
              'game_rate'.tr(), // Added Translation
              style: GoogleFonts.cinzel(
                color: const Color(0xFFF5F8FF),
                fontSize: 22,
                fontWeight: FontWeight.bold,
                letterSpacing: 3,
                shadows: [
                  Shadow(
                    color: const Color(0xFFF5F8FF).withValues(alpha: 0.2),
                    blurRadius: 10,
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _sectionBlock(_Section section) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SizedBox(height: 16),
        // 🚀 SECTION HEADER - Black background with Gold text for high contrast
        Container(
          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(10),
            color: const Color(0xFFF5F8FF), // Solid Black
            border: Border.all(color: AppColors.gold, width: 1.5),
            boxShadow: [
              BoxShadow(
                color: AppColors.gold.withValues(alpha: 0.2),
                blurRadius: 8,
                spreadRadius: 1,
              ),
            ],
          ),
          child: Text(
            section.title,
            textAlign: TextAlign.center,
            style: GoogleFonts.cinzel(
              color: AppColors.gold, // Gold text
              fontSize: 15,
              fontWeight: FontWeight.bold,
              letterSpacing: 1.5,
            ),
          ),
        ),
        const SizedBox(height: 10),
        ...section.rows.map(_rateRow),
      ],
    );
  }

  Widget _rateRow(_Row row) {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 4),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        color: Colors.white, // White background
        border: Border.all(
          color: const Color(0xFFF5F8FF).withValues(alpha: 0.1),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween, // Space between text and value
        children: [
          Text(
            row.name,
            style: GoogleFonts.lato(
              color: const Color(0xFFF5F8FF), // Black text
              fontSize: 15,
              fontWeight: FontWeight.w600,
            ),
          ),
          // 🚀 VALUE PILL - Gold background with black text
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            decoration: BoxDecoration(
              color: const Color(0xFF146043), // Light yellow
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppColors.gold, width: 1),
            ),
            child: Text(
              row.value,
              style: GoogleFonts.lato(
                color: const Color(0xFFF5F8FF),
                fontSize: 15,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Row {
  final String name;
  final String value;
  _Row(this.name, this.value);
}

class _Section {
  final String title;
  final List<_Row> rows;
  _Section({required this.title, required this.rows});
}