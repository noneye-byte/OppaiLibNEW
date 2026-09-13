package api

import (
	"bytes"
	"net/http"
	"strings"
)

// ── character library ────────────────────────────────────────────────────────
//
// A character is a reusable prompt fragment with a face: a name, the prompt text that
// conjures them, and a thumbnail. They exist so a recurring subject doesn't have to be
// retyped into every generation. Like model thumbnails they are picker chrome, not
// library items — stored encrypted under /config/characters, never in the media table.
// The storage is the shared prompt library (handlers_prompt_library.go); the one thing
// that is a character's alone is deriving a prompt from a reference picture.

// character is the record as the character endpoints have always returned it.
type character = promptFragment

// charView is what lists return: the record plus whether a thumbnail exists.
type charView = promptFragmentView

// charIDPattern is kept for the tests and callers that name it.
var charIDPattern = promptFragmentIDPattern

func (s *Server) characterLibrary() promptLibrary {
	return promptLibrary{dir: s.characterDir, aad: "character", thumbAAD: "character-thumb", listKey: "characters", noun: "character"}
}

func (s *Server) charThumbPath(id string) string { return s.characterLibrary().thumbPath(id) }

func (s *Server) readCharacter(id string) (*character, error) {
	return s.readPromptFragment(s.characterLibrary(), id)
}

func (s *Server) handleListCharacters(w http.ResponseWriter, r *http.Request) {
	s.handleListPromptFragments(s.characterLibrary())(w, r)
}

// handleSaveCharacter creates or updates a character. When the user supplies a
// reference image but no manual prompt, only stable appearance tags are derived.
// AnalyzeAppearance intentionally excludes objects, actions, scene details,
// identities, and content ratings.
func (s *Server) handleSaveCharacter(w http.ResponseWriter, r *http.Request) {
	s.handleSavePromptFragment(s.characterLibrary(), func(r *http.Request, req *savePromptFragmentReq, thumb []byte) {
		if len(thumb) == 0 || strings.TrimSpace(req.Prompt) != "" {
			return
		}
		if suggestions, err := s.ai.AnalyzeAppearance(r.Context(), bytes.NewReader(thumb)); err == nil {
			tags := make([]string, 0, len(suggestions))
			for _, suggestion := range suggestions {
				tags = append(tags, suggestion.Name)
			}
			req.Prompt = strings.Join(tags, ", ")
		}
	})(w, r)
}

func (s *Server) handleDeleteCharacter(w http.ResponseWriter, r *http.Request) {
	s.handleDeletePromptFragment(s.characterLibrary())(w, r)
}

func (s *Server) handleCharacterThumb(w http.ResponseWriter, r *http.Request) {
	s.handlePromptFragmentThumb(s.characterLibrary())(w, r)
}
