package handlers

import (
	"encoding/json"

	"gorm.io/datatypes"
)

func marshalJSON(v interface{}) (datatypes.JSON, error) {
	if v == nil {
		return datatypes.JSON([]byte("[]")), nil
	}
	b, err := json.Marshal(v)
	if err != nil {
		return nil, err
	}
	return datatypes.JSON(b), nil
}
