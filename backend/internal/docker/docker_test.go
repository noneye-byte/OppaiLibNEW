package docker

import (
	"encoding/json"
	"testing"
)

// Three containers as Unraid lists them: one with its port published on the box, one
// with its own address on br0, one on a shared network reached by name.
const listing = `[
 {"Id":"aaaaaaaaaaaa1111","Names":["/text-generation-webui"],"Ports":[{"IP":"0.0.0.0","PrivatePort":5000,"PublicPort":5000}],
  "NetworkSettings":{"Networks":{"bridge":{"IPAddress":"172.17.0.2"}}}},
 {"Id":"bbbbbbbbbbbb2222","Names":["/stable-diffusion"],"Ports":[],
  "NetworkSettings":{"Networks":{"br0":{"IPAddress":"192.168.1.60"}}}},
 {"Id":"cccccccccccc3333","Names":["/comfyui"],"Ports":[{"PrivatePort":8188}],
  "NetworkSettings":{"Networks":{"ai":{"IPAddress":"172.20.0.4"}}}},
 {"Id":"dddddddddddd4444","Names":["/oppailib"],"Ports":[{"IP":"0.0.0.0","PrivatePort":8080,"PublicPort":8080}],
  "NetworkSettings":{"Networks":{"ai":{"IPAddress":"172.20.0.5"}}}}
]`

func containers(t *testing.T) []Container {
	t.Helper()
	var list []Container
	if err := json.Unmarshal([]byte(listing), &list); err != nil {
		t.Fatal(err)
	}
	return list
}

func TestAnAddressLeadsToTheContainerBehindIt(t *testing.T) {
	list := containers(t)
	for address, want := range map[string]string{
		"http://192.168.1.10:5000":   "text-generation-webui", // published port, the box's address
		"http://tower.local:5000/v1": "text-generation-webui", // the box by name
		"http://192.168.1.60:7860":   "stable-diffusion",      // its own address on br0
		"http://comfyui:8188":        "comfyui",               // by name on a shared network
		"http://COMFYUI:8188":        "comfyui",
		"http://172.20.0.4:8188":     "comfyui",
		"http://192.168.1.10:9999":   "", // nothing publishes it
		"not a url":                  "",
		"http://192.168.1.10:8080":   "", // that is this container
	} {
		got := Match(list, address, "dddddddddddd")
		name := ""
		if got != nil {
			name = got.Name()
		}
		if name != want {
			t.Errorf("%s → %q, want %q", address, name, want)
		}
	}
}
