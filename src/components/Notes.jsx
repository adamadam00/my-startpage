import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Notes({ notes = [], workspaceId, userId, onRefresh }) {
  const safeNotes = Array.isArray(notes) ? notes : []
  const [open, setOpen]         = useState(true)
  const [adding, setAdding]     = useState(false)
  const [text, setText]         = useState('')
  const [editing, setEditing]   = useState(null)
  const [editText, setEditText] = useState('')
  const [err, setErr]           = useState('')

  const noteValue = (n) => {
    if (typeof n?.content === 'string') return n.content
    if (typeof n?.text === 'string') return n.text
    if (typeof n?.note === 'string') return n.note
    return ''
  }

  const add = async () => {
    if (!text.trim()) return
    setErr('')
    const { error } = await supabase.from('notes').insert({
      user_id: userId,
      workspace_id: workspaceId,
      content: text.trim(),
    })
    if (error) {
      setErr(error.message)
      return
    }
    setText('')
    setAdding(false)
    onRefresh()
  }

  const update = async (id) => {
    if (!editText.trim()) return
    const { error } = await supabase
      .from('notes')
      .update({ content: editText.trim() })
      .eq('id', id)

    if (error) {
      setErr(error.message)
      return
    }

    setEditing(null)
    setEditText('')
    onRefresh()
  }

  const remove = async (id) => {
    await supabase.from('notes').delete().eq('id', id)
    onRefresh()
  }

  const S = {
    card: {
      display: 'flex',
      flexDirection: 'column',
      minHeight: 0,
      background:
        'color-mix(in srgb, var(--notes-bg) calc(var(--card-opacity) * 100%), transparent)',
      border:
        '1px solid 