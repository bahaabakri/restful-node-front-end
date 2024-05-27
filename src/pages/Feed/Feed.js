import React, { Component, Fragment } from 'react';

import Post from '../../components/Feed/Post/Post';
import Button from '../../components/Button/Button';
import FeedEdit from '../../components/Feed/FeedEdit/FeedEdit';
import Input from '../../components/Form/Input/Input';
import Paginator from '../../components/Paginator/Paginator';
import Loader from '../../components/Loader/Loader';
import ErrorHandler from '../../components/ErrorHandler/ErrorHandler';
import './Feed.css';

class Feed extends Component {
  state = {
    isEditing: false,
    posts: [],
    totalPosts: 0,
    editPost: null,
    status: '',
    postPage: 1,
    postsLoading: true,
    editLoading: false
  };

  componentDidMount() {
    const graphqlGetStatus = {
      query: `
      {
        status {
          status
        }
      }
      `
    }
    fetch('http://localhost:8080/graphql', {
      method:'POST',
      body:JSON.stringify(graphqlGetStatus),
      headers: {
        Authorization: 'Bearer ' + localStorage.getItem('token'),
        'Content-Type': 'application/json'
      }
    })
      .then(res => {
        return res.json();
      })
      .then(resData => {
        if (resData.errors) {
          if (resData.errors[0].status === 401) {
            throw new Error('Could not authenticate you!');
          } else {
            throw new Error('failed to get status!')
          }
        }
        this.setState({ status: resData.data.status.status });
      })
      .catch(this.catchError);

    this.loadPosts();
  }

  loadPosts = direction => {
    if (direction) {
      this.setState({ postsLoading: true, posts: [] });
    }
    let page = this.state.postPage;
    if (direction === 'next') {
      page++;
      this.setState({ postPage: page });
    }
    if (direction === 'previous') {
      page--;
      this.setState({ postPage: page });
    }
    const graphqlGetPost = {
      query: `
        query Posts($page: Int!){
          posts(page:$page) {
            posts {
              _id
              content
              imageUrl
              title
              creator {
                name
              }
              createdAt
            }
            totalPosts
          }
        }
      `,
      variables: {
        page: page
      }
    }
    fetch('http://localhost:8080/graphql', {
      method: 'POST',
      body:JSON.stringify(graphqlGetPost),
      headers: {
        Authorization: 'Bearer ' + localStorage.getItem('token'),
        'Content-Type': 'application/json'
      }
      })
      .then(res => {
        return res.json();
      })
      .then(resData => {
        if (resData.errors) {
          if (resData.errors[0].status === 401) {
            throw new Error('Could not authenticate you!');
          } else {
            throw new Error('failed to get posts!')
          }
        }
        this.setState({
          posts: resData.data.posts.posts.map(post => {
            return {
              ...post,
              imagePath: post.imageUrl
            }
          }),
          totalPosts: resData.data.posts.totalPosts,
          postsLoading: false
        });
      })
      .catch(this.catchError);
  };

  statusUpdateHandler = event => {
    event.preventDefault();
    const graphqlUpdateStatus = {
      query: `
        mutation UpdateStatus($status: String!){
          updateStatus(newStatus: $status) {
            message
          }
        }
      `,
      variables: {
        status: this.state.status
      }
    }
    fetch('http://localhost:8080/graphql', {
      method: 'POST',
      body:JSON.stringify(graphqlUpdateStatus),
      headers: {
        Authorization: 'Bearer ' + localStorage.getItem('token'),
        'Content-Type': 'application/json'
      }
    })
      .then(res => {
        return res.json();
      })
      .then(resData => {
        if (resData.errors) {
          if (resData.errors[0].status === 401) {
            throw new Error('Could not authenticate you!');
          } else {
            throw new Error('failed to update status!')
          }
        }
        // this.setState({ status: resData.data.updateStatus.status });
        // console.log(resData);
      })
      .catch(this.catchError);
  };

  newPostHandler = () => {
    this.setState({ isEditing: true });
  };

  startEditPostHandler = postId => {
    this.setState(prevState => {
      const loadedPost = { ...prevState.posts.find(p => p._id === postId) };

      return {
        isEditing: true,
        editPost: loadedPost
      };
    });
  };

  cancelEditHandler = () => {
    this.setState({ isEditing: false, editPost: null });
  };

  finishEditHandler = postData => {
    const formData = new FormData()
    // formData.append('title', postData.title)
    // formData.append('content', postData.content)
    formData.append('image', postData.image)
    if (this.state.editPost) {
      formData.append('oldPath', this.state.editPost.imagePath)
    }
    this.setState({
      editLoading: true
    });
    fetch('http://localhost:8080/upload-image', {
      method:'PUT',
      headers: {
        'Authorization': 'Bearer ' + localStorage.getItem('token')
      },
      body: formData
    })
    .then(res => {
      return res.json();
    })
    .then(resData => {
      // no file provided send undifiend image and it will handle it from BE
      let imageUrl
      if (resData.fileUrl) {
        // Using forward slashes will make it system independent
        imageUrl = resData.fileUrl.replace('\\', '/') || "undefined"
      } else {
        imageUrl = "undefined"
      }
      let graphqlCreateUpdatePost
      if (this.state.editPost) {
        graphqlCreateUpdatePost = {
          query: `
            mutation UpdatePost($id:ID!, $title:String!, $content:String!, $imageUrl:String!) {
              updatePost(postId: $id,postInput: {title:$title, content:$content,imageUrl:$imageUrl}) {
                post {
                  _id,
                  title,
                  imageUrl
                  content,
                  creator {
                    name
                  },
                  createdAt
                }
                message
              }
            }
          `,
          variables: {
            id: this.state.editPost._id,
            title: postData.title,
            content: postData.content,
            imageUrl: imageUrl
          }
        }
      } else {
        graphqlCreateUpdatePost = {
          query: `
            mutation CreatePost($title:String!, $content:String!, $imageUrl:String!) {
              createPost(postInput: {title:$title,content:$content,imageUrl:$imageUrl}) {
                _id,
                title,
                imageUrl
                content,
                creator {
                  name
                },
                createdAt
              }
            }
          `,
          variables: {
            title: postData.title,
            content: postData.content,
            imageUrl: imageUrl
          }
        }
      }

      return fetch('http://localhost:8080/graphql', {
        method: 'POST',
        body: JSON.stringify(graphqlCreateUpdatePost),
        headers: {
          'Authorization': 'Bearer ' + localStorage.getItem('token'),
          'Content-Type': 'application/json'
        }
      })
    })
    // Set up data (with image!)
    // let url = 'http://localhost:8080/feed/post';
    // let method = 'POST'
    // if (this.state.editPost) {
    //   console.log(this.state.editPost);
    //   url = 'http://localhost:8080/feed/post/' + this.state.editPost._id;
    //   method = 'PUT'
    // }


    .then(res => {
      // if (res.status !== 200 && res.status !== 201) {
      //   throw new Error('Creating or editing a post failed!');
      // }
      return res.json();
    })
    .then(resData => {
      console.log(resData);
      if (resData.errors) {
        if (resData.errors[0].status === 401) {
          throw new Error('Could not authenticate you!');
        } else {
          throw new Error('Creating or editing a post failed!')
        }
      }
      let post
      if (this.state.editPost) {
        post = {
          _id: resData.data.updatePost.post._id,
          title: resData.data.updatePost.post.title,
          content: resData.data.updatePost.post.content,
          creator: resData.data.updatePost.post.creator,
          createdAt: resData.data.updatePost.post.createdAt,
          imagePath: resData.data.updatePost.post.imageUrl
        };
      } else {
        post = {
          _id: resData.data.createPost._id,
          title: resData.data.createPost.title,
          content: resData.data.createPost.content,
          creator: resData.data.createPost.creator,
          createdAt: resData.data.createPost.createdAt,
          imagePath: resData.data.createPost.imageUrl
        };
      }
      this.setState(prevState => {
        let updatedPosts = [...prevState.posts];
        let updatedTotalPosts = prevState.totalPosts
        if (prevState.editPost) {
          const postIndex = prevState.posts.findIndex(
            p => p._id === prevState.editPost._id
          );
          updatedPosts[postIndex] = post;
        } else {
          updatedTotalPosts++
          if (prevState.posts.length >= 2) {
            updatedPosts.pop()
          }
          updatedPosts.unshift(post)
        }
        return {
          posts: updatedPosts,
          isEditing: false,
          editPost: null,
          editLoading: false,
          totalPosts: updatedTotalPosts
        };
      });
    })
    .catch(err => {
      console.log(err);
      this.setState({
        isEditing: false,
        editPost: null,
        editLoading: false,
        error: err
      });
    });
  };

  statusInputChangeHandler = (input, value) => {
    this.setState({ status: value });
  };

  deletePostHandler = postId => {
    this.setState({ postsLoading: true });
    const graphqlDeletePost =
    {
      query: `
        mutation DeletePost($postId: ID!) {
          deletePost(postId: $postId) {
            message
          }
        }`,
        variables: {
          postId: postId
        }
    }
    fetch('http://localhost:8080/graphql',
      {
        method:'POST',
        headers: {
          'Authorization': 'Bearer ' + localStorage.getItem('token'),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(graphqlDeletePost)
      }
    )
      .then(res => {
        return res.json();
      })
      .then(resData => {
        if (resData.errors) {
          if(resData.errors[0].status === 401) {
            throw new Error('Could not authenticate you!');
          } else if (resData.errors[0].status === 403) {
            throw new Error('Unauthorized action!');
          } else {
            throw new Error('Some thing went wrong!');
          }
        }
        console.log(resData);
        this.loadPosts()
        // this.setState(prevState => {
        //   const updatedPosts = prevState.posts.filter(p => p._id !== postId);
        //   return { posts: updatedPosts, postsLoading: false, totalPosts:prevState.totalPosts - 1 };
        // });
      })
      .catch(err => {
        console.log(err);
        this.setState({ postsLoading: false });
      });
  };

  errorHandler = () => {
    this.setState({ error: null });
  };

  catchError = error => {
    this.setState({ error: error });
  };

  render() {
    return (
      <Fragment>
        <ErrorHandler error={this.state.error} onHandle={this.errorHandler} />
        <FeedEdit
          editing={this.state.isEditing}
          selectedPost={this.state.editPost}
          loading={this.state.editLoading}
          onCancelEdit={this.cancelEditHandler}
          onFinishEdit={this.finishEditHandler}
        />
        <section className="feed__status">
          <form onSubmit={this.statusUpdateHandler}>
            <Input
              type="text"
              placeholder="Your status"
              control="input"
              onChange={this.statusInputChangeHandler}
              value={this.state.status}
            />
            <Button mode="flat" type="submit">
              Update
            </Button>
          </form>
        </section>
        <section className="feed__control">
          <Button mode="raised" design="accent" onClick={this.newPostHandler}>
            New Post
          </Button>
        </section>
        <section className="feed">
          {this.state.postsLoading && (
            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
              <Loader />
            </div>
          )}
          {this.state.posts.length <= 0 && !this.state.postsLoading ? (
            <p style={{ textAlign: 'center' }}>No posts found.</p>
          ) : null}
          {!this.state.postsLoading && (
            <Paginator
              onPrevious={this.loadPosts.bind(this, 'previous')}
              onNext={this.loadPosts.bind(this, 'next')}
              lastPage={Math.ceil(this.state.totalPosts / 2)}
              currentPage={this.state.postPage}
            >
              {this.state.posts.map(post => (
                <Post
                  key={post._id}
                  id={post._id}
                  author={post.creator.name}
                  date={new Date(post.createdAt).toLocaleDateString('en-US')}
                  title={post.title}
                  image={post.imageUrl}
                  content={post.content}
                  onStartEdit={this.startEditPostHandler.bind(this, post._id)}
                  onDelete={this.deletePostHandler.bind(this, post._id)}
                />
              ))}
            </Paginator>
          )}
        </section>
      </Fragment>
    );
  }
}

export default Feed;
