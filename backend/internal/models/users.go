package models

import (
	"context"
	"errors"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"golang.org/x/crypto/bcrypt"
)

type User struct {
	ID       primitive.ObjectID `bson:"_id"`
	Name     string             `bson:"name"`
	Email    string             `bson:"email"`
	Password []byte             `bson:"hashed_password"`
	Created  time.Time          `bson:"created"`
}

type UserModel struct {
	collection *mongo.Collection
}

func NewUserModel(client *mongo.Client) *UserModel {
	return &UserModel{
		collection: client.Database("proctor").Collection("users"),
	}
}

func (m *UserModel) Insert(ctx context.Context, name, email, password string) error {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), 12)
	if err != nil {
		return err
	}

	user := User{
		ID:       primitive.NewObjectID(),
		Name:     name,
		Email:    email,
		Password: hashedPassword,
		Created:  time.Now().UTC(),
	}

	_, err = m.collection.InsertOne(ctx, user)
	if err != nil {
		var writeErr mongo.WriteError
		if errors.As(err, &writeErr) {
			if writeErr.Code == 11000 {
				return ErrDuplicateEmail
			}
		}
		return err
	}
	return nil
}

func (m *UserModel) Authenticate(ctx context.Context, email, password string) (primitive.ObjectID, error) {
	var user User
	err := m.collection.FindOne(ctx, bson.M{"email": email}).Decode(&user)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return primitive.NilObjectID, ErrInvalidCredentials
		}
		return primitive.NilObjectID, err
	}

	err = bcrypt.CompareHashAndPassword(user.Password, []byte(password))
	if err != nil {
		if errors.Is(err, bcrypt.ErrMismatchedHashAndPassword) {
			return primitive.NilObjectID, ErrInvalidCredentials
		}
		return primitive.NilObjectID, err
	}

	return user.ID, nil
}

func (m *UserModel) Exists(ctx context.Context, id primitive.ObjectID) (bool, error) {
	err := m.collection.FindOne(ctx, bson.M{"_id": id}).Err()
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return false, nil
		}
		return false, err
	}
	return true, nil
}
