import 'dart:async';
import 'package:flutter/material.dart';
import '../../services/api_service.dart';

class SupportScreen extends StatefulWidget {
  const SupportScreen({super.key, this.loadQuestions, this.loadMessages});
  final Future<List<dynamic>> Function()? loadQuestions;
  final Future<List<dynamic>> Function()? loadMessages;
  @override
  State<SupportScreen> createState() => _SupportScreenState();
}

class _SupportScreenState extends State<SupportScreen> {
  final _controller = TextEditingController();
  final _messageFocus = FocusNode();
  final _api = ApiService();
  List<dynamic> _messages = [];
  List<dynamic> _questions = [];
  int? _selectedQuestion;
  bool _showChat = false;
  Timer? _timer;
  bool _sending = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
    _loadQuestions();
    _timer = Timer.periodic(const Duration(seconds: 10), (_) => _load());
  }

  Future<void> _loadQuestions() async {
    try {
      final questions = await (widget.loadQuestions ?? _api.getSupportQuestions)();
      if (mounted) setState(() => _questions = questions);
    } catch (_) {
      if (mounted) setState(() => _error = 'Unable to load support questions. You can still send a message.');
    }
  }

  Future<void> _load() async {
    try {
      final messages = await (widget.loadMessages ?? _api.getSupportMessages)();
      if (mounted) setState(() { _messages = messages; _error = null; });
    } catch (_) {
      if (mounted) setState(() => _error = 'Unable to load messages. Please try again.');
    }
  }

  Future<void> _send() async {
    final message = _controller.text.trim();
    if (message.isEmpty || _sending) return;
    setState(() => _sending = true);
    try {
      await _api.sendSupportMessage(message);
      _controller.clear();
      await _load();
    } catch (_) {
      if (mounted) setState(() => _error = 'Message not sent. Please try again.');
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  void _openChat() => setState(() => _showChat = true);

  Widget _bubble(String text, {bool mine = false}) => Align(
    alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
    child: Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: mine ? const Color(0xFF063D30) : Colors.white, borderRadius: BorderRadius.circular(12)),
      child: Text(text, style: TextStyle(color: mine ? Colors.white : const Color(0xFF063D30))),
    ),
  );

  @override
  void dispose() { _timer?.cancel(); _controller.dispose(); _messageFocus.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: const Color(0xFFF9EED7),
    appBar: AppBar(backgroundColor: const Color(0xFF063D30), foregroundColor: Colors.white, title: const Text('Support')),
    body: Column(children: [
      if (_error != null) Padding(padding: const EdgeInsets.all(8), child: Text(_error!, style: const TextStyle(color: Colors.red))),
      Expanded(child: ListView(padding: const EdgeInsets.all(16), children: [
        if (!_showChat) ...[
        _bubble('Hello! How can I help you?'),
        if (_selectedQuestion == null) ...[
        ...List.generate(_questions.length, (index) {
          final item = _questions[index] as Map<String, dynamic>;
          return Card(color: Colors.white, child: ListTile(title: Text(item['question'].toString(), style: const TextStyle(color: Color(0xFF063D30))), trailing: const Icon(Icons.chevron_right, color: Color(0xFF063D30)), onTap: () => setState(() => _selectedQuestion = index)));
        }),
        TextButton(onPressed: _openChat, child: const Text('Other problem — contact support', style: TextStyle(color: Color(0xFF063D30)))),
        if (_messages.isNotEmpty) TextButton(onPressed: _openChat, child: const Text('View support conversation', style: TextStyle(color: Color(0xFF063D30)))),
        ] else ...[
          _bubble((_questions[_selectedQuestion!] as Map<String, dynamic>)['question'].toString(), mine: true),
          _bubble((_questions[_selectedQuestion!] as Map<String, dynamic>)['answer'].toString()),
          _bubble('Did this answer your question?'),
          Wrap(spacing: 8, children: [
            TextButton(onPressed: () => setState(() => _selectedQuestion = null), child: const Text('Yes, resolved', style: TextStyle(color: Color(0xFF063D30)))),
            TextButton(onPressed: _openChat, child: const Text('No, contact support', style: TextStyle(color: Color(0xFF063D30)))),
            TextButton(onPressed: () => setState(() => _selectedQuestion = null), child: const Text('Choose another question', style: TextStyle(color: Color(0xFF063D30)))),
          ]),
        ],
        ] else ...[
        TextButton(onPressed: () => setState(() => _showChat = false), child: const Text('Back to questions', style: TextStyle(color: Color(0xFF063D30)))),
        const Text('Contact the support team', style: TextStyle(color: Color(0xFF063D30), fontSize: 18, fontWeight: FontWeight.bold)),
        ...List.generate(_messages.length, (index) {
            final item = _messages[index] as Map<String, dynamic>;
            final mine = item['sender'] == 'user';
            return _bubble(item['message'].toString(), mine: mine);
          }),
        ],
      ])),
      if (_showChat) SafeArea(top: false, child: Padding(padding: const EdgeInsets.all(12), child: Row(children: [
        Expanded(child: TextField(
          controller: _controller,
          focusNode: _messageFocus,
          maxLength: 4000,
          style: const TextStyle(color: Color(0xFF063D30)),
          cursorColor: const Color(0xFF063D30),
          decoration: const InputDecoration(
            hintText: 'Type your message...',
            hintStyle: TextStyle(color: Color(0xFF596E63)),
            counterText: '',
            enabledBorder: OutlineInputBorder(borderSide: BorderSide(color: Color(0xFF82978A))),
            focusedBorder: OutlineInputBorder(borderSide: BorderSide(color: Color(0xFF063D30), width: 2)),
          ),
        )),
        IconButton(onPressed: _sending ? null : _send, icon: const Icon(Icons.send, color: Color(0xFF063D30)), tooltip: 'Send'),
      ]))),
    ]),
  );
}
