import '../../widgets/flame_border.dart';
import '../../widgets/flame_text.dart';
import '../../widgets/theme_hover_shadow.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../config/colors.dart';
import '../../models/market.dart';
import '../../services/api_service.dart';
import '../../widgets/cosmic_background.dart';

class ChartDetailScreen extends StatefulWidget {
  final Market market;
  const ChartDetailScreen({super.key, required this.market});

  @override
  State<ChartDetailScreen> createState() => _ChartDetailScreenState();
}

class _ChartDetailScreenState extends State<ChartDetailScreen>
    with SingleTickerProviderStateMixin {
  final _api = ApiService();
  late TabController _tab;
  bool _loading = true;
  String? _error;
  List<Map<String, dynamic>> _rows = [];

  @override
  void initState() {
    super.initState();
    _tab = TabController(length: 2, vsync: this);
    _tab.addListener(() {
      if (!_tab.indexIsChanging) _load();
    });
    _load();
  }

  @override
  void dispose() {
    _tab.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final slug = widget.market.slug.isNotEmpty
          ? widget.market.slug
          : widget.market.name.toLowerCase().replaceAll(' ', '-');
      final res = _tab.index == 0
          ? await _api.getJodiChart(slug)
          : await _api.getPanaChart(slug);
      final data = res['data'] ?? res;
      List<Map<String, dynamic>> flat = [];
      // Backend returns { market, weeks: [[...], [...]] } — flatten
      if (data is Map && data['weeks'] is List) {
        for (final week in (data['weeks'] as List)) {
          if (week is List) {
            for (final row in week) {
              if (row is Map) flat.add(Map<String, dynamic>.from(row));
            }
          }
        }
      } else if (data is List) {
        for (final row in data) {
          if (row is Map) flat.add(Map<String, dynamic>.from(row));
        }
      }
      _rows = flat.reversed.toList();
    } catch (e) {
      _error = 'Could not load chart';
    }
    if (!mounted) return;
    setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: CosmicBackground(
        child: SafeArea(
          child: Column(
            children: [
              _header(context),
              _tabBar(),
              Expanded(child: _body()),
            ],
          ),
        ),
      ),
    );
  }

  Widget _header(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(4, 10, 12, 6),
      child: Row(
        children: [
          IconButton(
            icon: const Icon(Icons.arrow_back_ios_new_rounded,
                color: const Color(0xFFF5F8FF), size: 22),
            onPressed: () => Navigator.pop(context),
          ),
          Expanded(
            child: FlameText(child: Text(
              widget.market.name.toUpperCase(),
              style: GoogleFonts.cinzel(
                color: const Color(0xFFF5F8FF),
                fontSize: 20,
                fontWeight: FontWeight.bold,
                letterSpacing: 2.5,
                shadows: [
                  Shadow(
                    color: const Color(0xFFF5F8FF),
                    blurRadius: 10,
                  ),
                ],
              ),
            )),
          ),
          IconButton(
            icon: const Icon(Icons.refresh_rounded,
                color: const Color(0xFFF5F8FF), size: 22),
            onPressed: _load,
          ),
        ],
      ),
    );
  }

  Widget _tabBar() {
    return ThemeHoverShadow(child: Container(
      margin: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        color: const Color(0xFF1C3459),
        border: FlameBorder(width: 1.2),
      ),
      child: TabBar(
        controller: _tab,
        indicator: BoxDecoration(
          borderRadius: BorderRadius.circular(9),
          gradient: AppColors.goldGradient,
        ),
        indicatorSize: TabBarIndicatorSize.tab,
        dividerColor: Colors.transparent,
        labelColor: Colors.black,
        unselectedLabelColor: const Color(0xFFF5F8FF),
        labelStyle: GoogleFonts.cinzel(
          fontSize: 13,
          fontWeight: FontWeight.bold,
          letterSpacing: 1.5,
        ),
        tabs: const [
          Tab(text: 'JODI'),
          Tab(text: 'PANA'),
        ],
      ),
    ));
  }

  Widget _body() {
    if (_loading) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.gold),
      );
    }
    if (_error != null) {
      return Center(
        child: Text(_error!,
            style: GoogleFonts.lato(color: AppColors.textSecondary)),
      );
    }
    if (_rows.isEmpty) {
      return Center(
        child: Text('No chart data yet',
            style: GoogleFonts.lato(color: AppColors.textSecondary)),
      );
    }
    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(14, 4, 14, 20),
      physics: const BouncingScrollPhysics(),
      itemCount: _rows.length,
      itemBuilder: (_, i) => _tab.index == 0
          ? _jodiRow(_rows[i])
          : _panaRow(_rows[i]),
    );
  }

  Widget _jodiRow(Map<String, dynamic> r) {
    final date = _fmtDate(r['date']?.toString() ?? '');
    final jodi = (r['jodi'] ?? r['jodiResult'] ?? '--').toString();
    return ThemeHoverShadow(child: Container(
      margin: const EdgeInsets.symmetric(vertical: 4),
      padding:
      const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(10),
        color: const Color(0xFF1C3459),
        border: FlameBorder(width: 1),
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(
              date,
              style: GoogleFonts.lato(
                color: const Color(0xFFE9F1FF),
                fontSize: 12.5,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          Container(
            padding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(8),
              color: const Color(0xFF25456F),
              border: FlameBorder(width: 1),
            ),
            child: FlameText(child: Text(
              jodi,
              style: GoogleFonts.cinzel(
                color: const Color(0xFFF5F8FF),
                fontSize: 16,
                fontWeight: FontWeight.bold,
                letterSpacing: 2,
              ),
            )),
          ),
        ],
      ),
    ));
  }

  Widget _panaRow(Map<String, dynamic> r) {
    final date = _fmtDate(r['date']?.toString() ?? '');
    final op = (r['openPanna'] ?? '***').toString();
    final od = (r['open'] ?? r['openDigit'] ?? '*').toString();
    final cd = (r['close'] ?? r['closeDigit'] ?? '*').toString();
    final cp = (r['closePanna'] ?? '***').toString();

    return ThemeHoverShadow(child: Container(
      margin: const EdgeInsets.symmetric(vertical: 4),
      padding:
      const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(10),
        color: const Color(0xFF1C3459),
        border: FlameBorder(width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            date,
            style: GoogleFonts.lato(
              color: const Color(0xFFE9F1FF),
              fontSize: 11.5,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              _pannaChip(op),
              _sep(),
              _pannaChip(od, small: true),
              _sep(),
              _pannaChip(cd, small: true),
              _sep(),
              _pannaChip(cp),
            ],
          ),
        ],
      ),
    ));
  }

  Widget _pannaChip(String v, {bool small = false}) {
    return ThemeHoverShadow(child: Container(
      padding: EdgeInsets.symmetric(
        horizontal: small ? 10 : 12,
        vertical: 6,
      ),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(8),
        color: const Color(0xFF25456F),
        border: FlameBorder(width: 1),
      ),
      child: FlameText(child: Text(
        v,
        style: GoogleFonts.cinzel(
          color: const Color(0xFFF5F8FF),
          fontSize: small ? 13 : 15,
          fontWeight: FontWeight.bold,
          letterSpacing: 1.5,
        ),
      )),
    ));
  }

  Widget _sep() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4),
      child: FlameText(child: Text(
        '-',
        style: GoogleFonts.cinzel(
          color: const Color(0xFFF5F8FF),
          fontSize: 16,
          fontWeight: FontWeight.bold,
        ),
      )),
    );
  }

  String _fmtDate(String s) {
    if (s.isEmpty) return '--';
    final d = DateTime.tryParse(s);
    if (d == null) return s;
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return '${d.day.toString().padLeft(2, '0')} '
        '${months[d.month - 1]} ${d.year}';
  }
}